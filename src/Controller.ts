import type { BoidConfig, RendererConfig } from "./config"
import { FreqEstimator } from "./utilities/freqEstimator"
import { MouseStatus } from "./inputs/MouseStatus"
import { PolygonDrawer } from "./inputs/PolygonDrawer"
import { FlightZone } from "./FlightZone"
import { Renderer } from "./Renderer"
import { Simulation } from "./Simulation"

type renderingTask = {
  eTag: number // Too invalidate if no longer needed
  endTime?: number
  render?: () => void
  endCallback?: () => void
}

export class Controller {
  private renderer: Renderer
  private flightZone: FlightZone
  private simulation: Simulation
  private inputs: {
    mouseStatus: MouseStatus
    polygonDrawer: PolygonDrawer
  }

  readonly TARGET_TPS = 30
  readonly TARGET_TICK_TIME: number // in ms
  private tpsEstimator: FreqEstimator

  private debug: boolean = false

  private isRunning = false
  private simulationLoopId?: number = undefined
  private renderingLoopId?: number = undefined

  private renderingTasks: Map<string, renderingTask> = new Map()

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
      polygonDrawer: new PolygonDrawer(canvas),
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
    this.simulation.start(Math.floor(maxBoidCount * 0.7), boidConfig)
    this.simulationLoop()
    this.renderingLoop()
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
    this.renderer.drawFlightZone(
      this.flightZone,
      this.simulation.getConfig().visibleDistance,
      this.debug,
    )

    // Forground
    this.simulation.boids.forEach((boid) => {
      this.renderer.drawBoid(boid, this.simulation.getConfig().maxDepth)
    })
    if (this.debug) {
      this.renderer.drawHeight(maxHeight)
      this.renderer.drawCenterOwMass(this.simulation.getCenterOwMass())
      this.renderer.drawStats(this.simulation.boidCount(), tps, this.TARGET_TPS)
    }

    this.refreshRenderingTasks()

    // Request next frame
    this.renderingLoopId = requestAnimationFrame(this.renderingLoop.bind(this))
  }

  private refreshRenderingTasks(): void {
    const { state, eTag } = this.inputs.polygonDrawer.getState()
    const prevETag = this.renderingTasks.get("draftPolygon")?.eTag
    if (eTag !== prevETag) {
      const polygonOnCanvas = this.inputs.polygonDrawer.getPolygonOnCanvas()
      let endTime: number
      switch (state) {
        case null:
          // Clear, nothing to see here
          this.renderingTasks.set("draftPolygon", { eTag })
          this.flightZone.resetPolygon()
          break

        case "drawing":
          this.renderingTasks.set("draftPolygon", {
            eTag,
            render: () => this.renderer.drawDraftPolygon(polygonOnCanvas, false),
          })
          break

        case "failed":
          endTime = performance.now() + 1_510
          this.renderingTasks.set("draftPolygon", {
            eTag,
            endTime,
            render: () =>
              this.renderer.drawDraftPolygon(
                polygonOnCanvas,
                false,
                "#ff0000",
                endTime - performance.now(),
                3, // Blinking factor
              ),
          })
          break

        case "closed":
          endTime = performance.now() + 3_010
          this.renderingTasks.set("draftPolygon", {
            eTag,
            endTime,
            render: () =>
              this.renderer.drawDraftPolygon(
                polygonOnCanvas,
                true,
                undefined,
                endTime - performance.now(),
              ),
            endCallback: () => {
              this.flightZone.setPolygon(polygonOnCanvas)
            },
          })
          break
      }
    }
    // Render active task
    this.renderingTasks.forEach((task, key) => {
      if (!task.render) return
      if (task.endTime && performance.now() >= task.endTime) {
        task.endCallback?.()
        this.renderingTasks.set(key, { eTag: task.eTag })
        return
      }
      task.render()
    })
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
