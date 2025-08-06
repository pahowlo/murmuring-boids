import type { BoidConfig, RendererConfig } from "./config"
import { FpsEstimator } from "./utilities/fpsEstimator"
import { MouseStatus } from "./inputs/MouseStatus"
import { FlightZone } from "./FlightZone"
import { Renderer } from "./Renderer"
import { Simulation } from "./Simulation"

export class Controller {
  private renderer: Renderer
  private flightZone: FlightZone
  private simulation: Simulation
  private inputs: {
    mouseStatus: MouseStatus
  }

  readonly TARGET_FPS = 30
  readonly TARGET_FRAME_TIME: number // in ms
  private fpsEstimator: FpsEstimator

  private debug: boolean = false

  private isRunning = false
  private animationId: number | null = null
  private resizeTimeoutId: number | null = null

  constructor(
    window: Window,
    canvas: HTMLCanvasElement,
    rendererConfig: Partial<RendererConfig> = {},
  ) {
    this.renderer = new Renderer(window, canvas, rendererConfig)
    this.simulation = new Simulation(this.renderer.screenBox)
    this.flightZone = new FlightZone(this.renderer.canvasBox, this.simulation.getConfig().maxDepth)
    this.inputs = {
      mouseStatus: new MouseStatus(canvas),
    }

    this.TARGET_FRAME_TIME = 1000 / this.TARGET_FPS
    this.fpsEstimator = new FpsEstimator()
  }

  start(maxBoidCount: number, debug: boolean, boidConfig: Partial<BoidConfig> = {}): void {
    this.debug = debug

    this.simulation.boidConfig = boidConfig
    this.simulation.maxBoidCount = maxBoidCount

    if (this.isRunning) {
      this.simulation.boidConfig = boidConfig
      return
    }

    this.isRunning = true
    this.simulation.start(Math.floor(maxBoidCount / 4), boidConfig)
    this.animationLoop()
    this.resizeLoop()
  }

  private async animationLoop(): Promise<void> {
    if (!this.isRunning) return

    // Update simulation
    this.flightZone.clearCentroids()
    const mousePositionOnCanvas = this.inputs.mouseStatus.getPositionOnCanvas()
    if (mousePositionOnCanvas) {
      this.flightZone.addCentroid(mousePositionOnCanvas)
    }

    const prevFrameTime = this.fpsEstimator.getLastFrameTime()
    const fps = this.fpsEstimator.getFps()
    const targetFpsDiff = fps - this.TARGET_FPS
    if (targetFpsDiff > 1) {
      this.simulation.addBoidsIfMissing(100)
    }
    if (targetFpsDiff > 2) {
      // Slow down to avoid rendering too fast at first
      const waitTime = this.TARGET_FRAME_TIME - (performance.now() - prevFrameTime)
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }

    const maxHeight = this.renderer.maxHeight
    this.simulation.update(this.flightZone, maxHeight)

    // Draw
    this.renderer.clearCanvas()
    // Background
    if (this.debug) {
      this.renderer.drawFlightZone(this.flightZone, this.simulation.getConfig().visibleRange)
    }

    // Forground
    this.simulation.boids.forEach((boid) => {
      this.renderer.drawBoid(boid, this.simulation.getConfig().maxDepth)
    })
    if (this.debug) {
      this.renderer.drawStats(this.simulation.boidCount(), fps, this.TARGET_FPS)
      this.renderer.drawHeight(maxHeight)
    }

    // Update FPS estimation
    this.fpsEstimator.update()
    // Request next frame
    this.animationId = requestAnimationFrame(this.animationLoop.bind(this))
  }

  private async resizeLoop(): Promise<void> {
    if (!this.isRunning) return

    // Resize only display settings have changed
    const resized = this.renderer.checkResize() // Start fresh
    this.flightZone.resize(this.renderer.canvasBox)
    if (resized) {
      this.simulation.resize(this.renderer.screenBox)
    }

    // Trigger next resize check
    this.resizeTimeoutId = setTimeout(this.resizeLoop.bind(this), 10) as unknown as number
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId)
      this.resizeTimeoutId = null
    }

    this.renderer.clearCanvas()
    this.simulation.stop()
    this.isRunning = false
  }
}
