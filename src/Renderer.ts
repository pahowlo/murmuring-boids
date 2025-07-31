import type { RendererConfig } from "./config"
import { Boid } from "./Boid"
import { FlightZone, Box } from "./FlightZone"

export const defaultRendererConfig: RendererConfig = {
  clearCanvasIfResized: true,
  boids: {
    lineWidth: 0.1,
    size: 3,
  },
  debug: {
    flightZoneColor: "#00ff00",
  },
}

function setupBoidPath(): Path2D {
  const boidPath = new Path2D()
  const size = 1
  // Wing triangle
  boidPath.moveTo(-size * 0.5, size * 0.3)
  boidPath.lineTo(size, 0) // Nose
  boidPath.lineTo(-size * 0.5, -size * 0.3)

  // Bottom
  boidPath.moveTo(-size * 0.5, size * 0.3)
  boidPath.lineTo(-size * 0.5, -size * 0.3)
  //boidPath.closePath() // Left wing

  // Fold (center line)
  boidPath.moveTo(size, 0) // Nose
  boidPath.lineTo(-size * 0.5, 0)

  return boidPath
}

// Main class
export class Renderer {
  private window: Window
  private canvas: HTMLCanvasElement
  private renderingContext: CanvasRenderingContext2D

  private config: RendererConfig

  screenBox: Box
  canvasBox: Box
  private devicePixelRatio: number

  private boidPath: Path2D = setupBoidPath()

  constructor(
    window: Window,
    canvas: HTMLCanvasElement,
    rendererConfig: Partial<RendererConfig> = {},
  ) {
    this.window = window
    this.canvas = canvas

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")
    this.renderingContext = ctx

    this.config = {
      ...defaultRendererConfig,
      ...rendererConfig,
    }

    this.screenBox = new Box(0, 0, this.window.screen.width, this.window.screen.height)
    this.devicePixelRatio = this.window.devicePixelRatio || 1

    const r = this.canvas.getBoundingClientRect()
    this.canvasBox = new Box(
      this.window.screenX + (this.window.outerWidth - this.window.innerWidth) + r.left,
      this.window.screenY + (this.window.outerHeight - this.window.innerHeight) + r.top,
      r.width,
      r.height,
    )

    this.scaleCanvas()
  }

  /**
   * Return true if a change was detected in display settings that lead to resizing the canvas.
   */
  checkResize(): boolean {
    this.screenBox = new Box(0, 0, this.window.screen.width, this.window.screen.height)

    // Check if display settings have changed
    const newdevicePixelRatio = this.window.devicePixelRatio || 1

    const r = this.canvas.getBoundingClientRect()
    const newCanvasBox = new Box(
      this.window.screenX + (this.window.outerWidth - this.window.innerWidth) + r.left,
      this.window.screenY + (this.window.outerHeight - this.window.innerHeight) + r.top,
      r.width,
      r.height,
    )

    if (this.canvasBox.equals(newCanvasBox) && this.devicePixelRatio === newdevicePixelRatio) {
      return false // No resize required
    }

    if (this.config.clearCanvasIfResized) {
      // Start clean
      this.clearCanvas()
    }
    // Redraw canvas to match new display settings
    this.devicePixelRatio = newdevicePixelRatio
    this.canvasBox = newCanvasBox
    this.scaleCanvas()
    return true
  }

  private scaleCanvas(): void {
    const ctx = this.renderingContext

    // Fetch canvas CSS pixel dimensions
    const displayWidth = this.canvas.clientWidth
    const displayHeight = this.canvas.clientHeight

    // Update canvas real pixel dimensions to match device DPI
    this.canvas.width = displayWidth * this.devicePixelRatio
    this.canvas.height = displayHeight * this.devicePixelRatio

    // Updating canvas width/height resets rendering context (inc. scaling)
    // thus no risk of compounding
    // Scale rendering
    ctx.scale(this.devicePixelRatio, this.devicePixelRatio)
  }

  clearCanvas(): void {
    const ctx = this.renderingContext

    // Updating canvas width/height resets rendering context (inc. scaling)
    ctx.canvas.width = ctx.canvas.width
    // Scale rendering
    ctx.scale(this.devicePixelRatio, this.devicePixelRatio)
  }

  drawFlightZone(flightZone: FlightZone): void {
    const startX = this.canvasBox.start.x
    const startY = this.canvasBox.start.y

    const ctx = this.renderingContext
    ctx.save()

    ctx.strokeStyle = this.config.debug.flightZoneColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(flightZone.polygon[0][0] - startX, flightZone.polygon[0][1] - startY)
    for (let i = 1; i < flightZone.polygon.length; i++) {
      ctx.lineTo(flightZone.polygon[i][0] - startX, flightZone.polygon[i][1] - startY)
    }
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = this.config.debug.flightZoneColor
    ctx.beginPath()
    for (const point of flightZone.centroids) {
      ctx.arc(point[0] - startX, point[1] - startY, 2, 0, 2 * Math.PI)
    }
    ctx.fill()
    ctx.closePath()

    ctx.restore()
  }

  drawBoid(boid: Boid, maxDepth: number): void {
    const pos = boid.getPosition()
    const vel = boid.getVelocity()

    const startX = this.canvasBox.start.x
    const startY = this.canvasBox.start.y

    const depthRatio = Math.min(1.125, Math.max(-0.125, pos[2] / maxDepth))

    let boidSize = this.config.boids.size
    if (depthRatio < 0) {
      boidSize += -depthRatio * 8 // [0, 1]
    } else if (depthRatio > 1) {
      boidSize -= (depthRatio - 1) * 8 // [-1, 0]
    }

    const ctx = this.renderingContext
    ctx.save()

    ctx.translate(pos[0] - startX, pos[1] - startY)
    ctx.rotate(Math.atan2(vel[1], vel[0]))
    ctx.scale(boidSize, boidSize)

    ctx.strokeStyle = `hsl(10, 10%, ${Math.max(10, 90 - depthRatio * 80)}%)`
    ctx.lineWidth = this.config.boids.lineWidth
    ctx.stroke(this.boidPath)

    ctx.restore()
  }
}
