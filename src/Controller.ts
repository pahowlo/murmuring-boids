import { BoidConfig, RendererConfig } from "./config.d"
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

  constructor(window: Window, canvas: HTMLCanvasElement, rendererConfig: Partial<RendererConfig> = {}) {
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
    this.animate()
  }

  private animate = (): void => {
    if (!this.isRunning) return

    // Resize if needed
    this.renderer.resize()
    this.flightZone.resize(this.renderer.canvasBox)
    this.simulation.resize(this.renderer.screenBox)

    // Increment simulation
    this.simulation.update(this.flightZone)

    // Render
    this.renderer.clearCanvas()
    if (this.debug) {
      this.renderer.drawFlightZone(this.flightZone)
    }

    this.simulation.boids.forEach((boid) => {
      this.renderer.drawBoid(boid, maxDepth)
    })

    this.animationId = requestAnimationFrame(this.animate)
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    this.renderer.clearCanvas()
    this.simulation.stop()
    this.isRunning = false
  }
}
