import type { BoidConfig, RendererConfig } from "./config"
import { FreqEstimator } from "./utilities/freqEstimator"
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

  readonly TARGET_TPS = 30
  readonly TARGET_TICK_TIME: number // in ms
  private tpsEstimator: FreqEstimator

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

    this.TARGET_TICK_TIME = 1000 / this.TARGET_TPS
    this.tpsEstimator = new FreqEstimator(this.TARGET_TPS)
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

    const tps = this.tpsEstimator.get()
    const maxHeight = this.renderer.maxHeight

    // Draw
    this.renderer.clearCanvas()
    // Background
    if (this.debug) {
      this.renderer.drawFlightZone(this.flightZone, this.simulation.getConfig().visibleDistance)
    }

    // Forground
    this.simulation.boids.forEach((boid) => {
      this.renderer.drawBoid(boid, this.simulation.getConfig().maxDepth)
    })
    if (this.debug) {
      this.renderer.drawStats(this.simulation.boidCount(), tps, this.TARGET_TPS)
      this.renderer.drawHeight(maxHeight)
    }

    // Request next frame
    this.renderingLoopId = requestAnimationFrame(this.renderingLoop.bind(this))
  }

  private async simulationLoop(): Promise<void> {
    if (!this.isRunning) return

    const prevTime = this.tpsEstimator.getPrevTime()
    const tps = this.tpsEstimator.get()

    const targetTpsDiff = tps - this.TARGET_TPS

    if (targetTpsDiff > 0) {
      this.simulation.addBoidsIfMissing(100)

      // Slow down to avoid rendering too fast at first
      const waitTime = this.TARGET_TICK_TIME - (performance.now() - prevTime)
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    } else if (targetTpsDiff <= -8) {
      this.simulation.removeBoids(5)
    }

    const maxHeight = this.renderer.maxHeight
    this.simulation.update(this.flightZone, maxHeight)

    // Update FPS estimation
    this.tpsEstimator.update()
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
