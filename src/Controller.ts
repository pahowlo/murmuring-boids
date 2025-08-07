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
  private simulationLoopId?: number = undefined
  private renderingLoopId?: number = undefined

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
    this.fpsEstimator = new FpsEstimator(this.TARGET_FPS)
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
    this.simulation.start(Math.floor(maxBoidCount * 0.75), boidConfig)
    this.simulationLoop()
    this.renderingLoop()
  }

  private async renderingLoop(): Promise<void> {
    if (!this.isRunning) return

    // Resize only display settings have changed
    const resized = this.renderer.checkResize() // Start fresh
    this.flightZone.resize(this.renderer.canvasBox)
    if (resized) {
      this.simulation.resize(this.renderer.screenBox)
    }

    // Update simulation
    this.flightZone.clearCentroids()
    const mousePositionOnCanvas = this.inputs.mouseStatus.getPositionOnCanvas()
    if (mousePositionOnCanvas) {
      this.flightZone.addCentroid(mousePositionOnCanvas)
    }

    const fps = this.fpsEstimator.getFps()
    const maxHeight = this.renderer.maxHeight

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

    // Request next frame
    this.renderingLoopId = requestAnimationFrame(this.renderingLoop.bind(this))
  }

  private async simulationLoop(): Promise<void> {
    if (!this.isRunning) return

    const prevFrameTime = this.fpsEstimator.getLastFrameTime()
    const fps = this.fpsEstimator.getFps()

    const targetFpsDiff = fps - this.TARGET_FPS

    if (targetFpsDiff > 0) {
      this.simulation.addBoidsIfMissing(100)

      // Slow down to avoid rendering too fast at first
      const waitTime = this.TARGET_FRAME_TIME - (performance.now() - prevFrameTime)
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    } else if (targetFpsDiff <= -8) {
      this.simulation.removeBoids(5)
    }

    const maxHeight = this.renderer.maxHeight
    this.simulation.update(this.flightZone, maxHeight)

    // Update FPS estimation
    this.fpsEstimator.update()
    // Trigger next resize check
    this.simulationLoopId = requestAnimationFrame(this.simulationLoop.bind(this))
  }

  stop(): void {
    if (this.simulationLoopId) {
      cancelAnimationFrame(this.simulationLoopId)
      this.simulationLoopId = undefined
    }
    if (this.renderingLoopId) {
      cancelAnimationFrame(this.renderingLoopId)
      this.renderingLoopId = undefined
    }

    this.renderer.clearCanvas()
    this.simulation.stop()
    this.isRunning = false
  }
}
