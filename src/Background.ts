import { vec3, vec2 } from "gl-matrix"

import { CanvasConfig, RenderOptions, RenderContext } from "./types"
import { defaultRenderOptions } from "./config"
import { Boid } from "./boid"

export class MurmuringBoidsBackground {
  private renderContext: RenderContext
  private debug: boolean = false

  private animationId: number | null = null
  private isRunning = false

  private boids: Boid[] = []
  private flightZone: vec2[]
  private flightZoneCenter: vec3

  constructor(
    window: Window,
    canvas: HTMLCanvasElement,
    canvasConfig: CanvasConfig,
    renderOptions: Partial<RenderOptions> = {},
  ) {
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")

    this.renderContext = {
      canvas,
      ctx,
      options: {
        ...defaultRenderOptions,
        ...renderOptions,
      },
    }

    const windowSize = {
      width: window.innerWidth,
      height: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: 0,
    }

    this.flightZone = [
      vec2.fromValues(
        // left-top
        windowSize.width * (canvasConfig.topLeft.x + 0.2),
        windowSize.height * (canvasConfig.topLeft.y + 0.2),
      ),
      vec2.fromValues(
        // right-top
        windowSize.width * (canvasConfig.bottomRight.x - 0.2),
        windowSize.height * (canvasConfig.topLeft.y + 0.2),
      ),
      vec2.fromValues(
        // right-bottom
        windowSize.width * (canvasConfig.bottomRight.x - 0.2),
        windowSize.height * (canvasConfig.bottomRight.y - 0.3),
      ),
      vec2.fromValues(
        // left-bottom
        windowSize.width * (canvasConfig.topLeft.x + 0.2),
        windowSize.height * (canvasConfig.bottomRight.y - 0.3),
      ),
    ]

    this.flightZoneCenter = vec3.fromValues(
      this.flightZone.reduce((sum, v) => sum + v[0], 0) / this.flightZone.length,
      this.flightZone.reduce((sum, v) => sum + v[1], 0) / this.flightZone.length,
      0,
    )

    canvas.style.backgroundColor = this.renderContext.options.backgroundColor

    function resizeCanvas(): void {
      if (
        windowSize.screenWidth === window.screen.width &&
        windowSize.screenHeight === window.screen.height &&
        windowSize.devicePixelRatio === window.devicePixelRatio
      ) {
        return // No resize needed
      }

      windowSize.width = window.innerWidth
      windowSize.height = window.innerHeight
      windowSize.screenWidth = window.screen.width
      windowSize.screenWidth = window.screen.height
      windowSize.devicePixelRatio = window.devicePixelRatio

      const dpr = window.devicePixelRatio || 1

      const x = canvasConfig.topLeft.x * windowSize.width
      const y = canvasConfig.topLeft.y * windowSize.height
      const width = (canvasConfig.bottomRight.x - canvasConfig.topLeft.x) * windowSize.width
      const height = (canvasConfig.bottomRight.y - canvasConfig.topLeft.y) * windowSize.height
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

  start(boidCount: number, debug: boolean): void {
    if (this.isRunning) return

    this.debug = debug

    for (let i = 0; i < boidCount; i++) {
      const position = vec3.fromValues(
        Math.random() * this.renderContext.canvas.clientWidth,
        Math.random() * this.renderContext.canvas.clientHeight,
        Math.random() * this.renderContext.options.canvasDepth, // Use canvasDepth from config
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
      boid.update(this.boids, this.flightZone, this.flightZoneCenter)
    })
    this.render()
    this.animationId = requestAnimationFrame(this.animate)
  }

  render(): void {
    const { ctx, canvas } = this.renderContext
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (this.debug) {
      this.renderFlightZone()
    }
    this.boids.forEach((boid) => {
      boid.render(this.renderContext)
    })
  }

  renderFlightZone(): void {
    const { ctx } = this.renderContext
    ctx.save()
    ctx.strokeStyle = "#00ff00" // or any color you like
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.flightZone[0][0], this.flightZone[0][1])
    for (let i = 1; i < this.flightZone.length; i++) {
      ctx.lineTo(this.flightZone[i][0], this.flightZone[i][1])
    }
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = "#00ff00" // center color
    ctx.beginPath()
    ctx.arc(this.flightZoneCenter[0], this.flightZoneCenter[1], 2, 0, 2 * Math.PI)
    ctx.fill()

    ctx.restore()
  }
}
