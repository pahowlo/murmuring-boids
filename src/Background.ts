import { vec3 } from "gl-matrix"

import { BoidConfig, CanvasConfig, RenderContext } from "./types"
import { Boid } from "./boid"

export class MurmuringBoidsBackground {
  private renderContext: RenderContext
  private animationId: number | null = null
  private isRunning = false
  private boids: Boid[] = []

  constructor(window: Window, canvas: HTMLCanvasElement, canvasConfig: CanvasConfig, renderOptions = {}) {
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")

    this.renderContext = { canvas, ctx }

    const defaultConfig: BoidConfig = {
      maxSpeed: 2,
    }

    const defaultRenderOptions = {
      size: 6,
      color: "#ffffff",
      showTrail: false,
      trailLength: 20,
      trailColor: "#ffffff",
      trailOpacity: 0.3,
      ...renderOptions,
    }

    const screen = {
      width: 0,
      height: 0,
      devicePixelRatio: 0,
    }

    function resizeCanvas() {
      if (
        screen.width === window.screen.width &&
        screen.height === window.screen.height &&
        screen.devicePixelRatio === window.devicePixelRatio
      ) {
        return // No resize needed
      }

      screen.width = window.screen.width
      screen.height = window.screen.height
      screen.devicePixelRatio = window.devicePixelRatio

      const dpr = window.devicePixelRatio || 1

      const x = canvasConfig.topLeft.x * screen.width
      const y = canvasConfig.topLeft.y * screen.height
      const width = (canvasConfig.bottomRight.x - canvasConfig.topLeft.x) * screen.width
      const height = (canvasConfig.bottomRight.y - canvasConfig.topLeft.y) * screen.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.position = "absolute"
      canvas.style.left = x + "px"
      canvas.style.top = y + "px"
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas context not available")
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
  }

  start(boidCount = 100): void {
    if (this.isRunning) return

    for (let i = 0; i < boidCount; i++) {
      const position = vec3.fromValues(
        Math.random() * this.renderContext.canvas.width,
        Math.random() * this.renderContext.canvas.height,
        0,
      )
      this.boids.push(new Boid(position, { maxSpeed: 2 }))
    }

    this.isRunning = true
    this.animate()
  }

  stop(): void {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return

    this.boids.forEach((boid) => {
      boid.update(this.boids)
    })
    this.render()

    this.animationId = requestAnimationFrame(this.animate)
  }

  render(): void {
    const { ctx, canvas } = this.renderContext
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    this.boids.forEach((boid) => {
      boid.render(this.renderContext)
    })
  }
}
