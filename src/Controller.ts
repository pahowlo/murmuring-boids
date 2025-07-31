import type { BoidConfig, RendererConfig } from "./config"
import { FlightZone } from "./FlightZone"
import { Renderer } from "./Renderer"
import { Simulation } from "./Simulation"

export const maxDepth = 500

export class Controller {
  private renderer: Renderer
  private flightZone: FlightZone
  private simulation: Simulation

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
    this.flightZone = new FlightZone(this.renderer.canvasBox)
    this.simulation = new Simulation(this.renderer.screenBox, maxDepth)
  }

  start(boidCount: number, debug: boolean, boidConfig: Partial<BoidConfig> = {}): void {
    this.debug = debug
    this.simulation.maxBoidCount = boidCount
    this.simulation.boidConfig = boidConfig

    if (this.isRunning) return

    this.isRunning = true
    this.simulation.start(boidCount, boidConfig)
    this.animationLoop()
    this.resizeLoop()
  }

  private animationLoop = (): void => {
    if (!this.isRunning) return

    // Update simulation
    this.simulation.update(this.flightZone)

    // Draw
    this.renderer.clearCanvas() // Start clean
    if (this.debug) {
      this.renderer.drawFlightZone(this.flightZone)
    }

    this.simulation.boids.forEach((boid) => {
      this.renderer.drawBoid(boid, maxDepth)
    })

    this.animationId = requestAnimationFrame(this.animationLoop)
  }

  private resizeLoop = (): void => {
    if (!this.isRunning) return

    // Resize only display settings have changed
    const resized = this.renderer.checkResize() // Start fresh
    if (resized) {
      this.flightZone.resize(this.renderer.canvasBox)
      this.simulation.resize(this.renderer.screenBox)
    }

    // FPS 100
    this.resizeTimeoutId = setTimeout(this.resizeLoop, 10) as unknown as number
  }

  stop(): void {
    if (this.resizeTimeoutId) {
      cancelAnimationFrame(this.resizeTimeoutId)
      this.resizeTimeoutId = null
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
