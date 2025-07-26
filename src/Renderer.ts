import { RendererConfig } from "./config.d"
import { Boid } from "./Boid"
import { FlightZone, Box } from "./FlightZone"

export const defaultRendererConfig: RendererConfig = {
  backgroundColor: "#212121",
  clearCanvasIfResized: true,
  debug: {
    flightZoneColor: "#00ff00",
  },
}

// Main class
export class Renderer {
  private window: Window
  private canvas: HTMLCanvasElement
  private renderingContext: CanvasRenderingContext2D

  private rendererConfig: RendererConfig

  screenBox: Box
  canvasBox: Box
  private devicePixelRatio: number

  constructor(window: Window, canvas: HTMLCanvasElement, rendererConfig: Partial<RendererConfig> = {}) {
    this.window = window
    this.canvas = canvas

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")
    this.renderingContext = ctx

    this.rendererConfig = {
      ...defaultRendererConfig,
      ...rendererConfig,
    }

    this.screenBox = new Box(0, 0, this.window.screen.width, this.window.screen.height)
    this.devicePixelRatio = 1

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
      // No resize required
      return false
    }

    if (this.rendererConfig.clearCanvasIfResized) {
      this.clearCanvas() // Start clean
    }
    // Redraw canvas to match new display settings
    this.devicePixelRatio = newdevicePixelRatio
    this.canvasBox = newCanvasBox
    this.scaleCanvas()
    return true
  }

  private scaleCanvas(): void {
    this.canvas.style.backgroundColor = this.rendererConfig.backgroundColor

    // Fetch canvas CSS pixel size
    const displayWidth = this.canvas.clientWidth
    const displayHeight = this.canvas.clientHeight

    // Update canvas real pixel size to match device DPI
    this.canvas.width = displayWidth * this.devicePixelRatio
    this.canvas.height = displayHeight * this.devicePixelRatio

    // Scale rendering
    const ctx = this.renderingContext

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(this.devicePixelRatio, this.devicePixelRatio)
  }

  clearCanvas(): void {
    const ctx = this.renderingContext
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  drawFlightZone(flightZone: FlightZone): void {
    const startX = this.canvasBox.start.x
    const startY = this.canvasBox.start.y

    const ctx = this.renderingContext
    ctx.save()

    ctx.strokeStyle = this.rendererConfig.debug.flightZoneColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(flightZone.polygon[0][0] - startX, flightZone.polygon[0][1] - startY)
    for (let i = 1; i < flightZone.polygon.length; i++) {
      ctx.lineTo(flightZone.polygon[i][0] - startX, flightZone.polygon[i][1] - startY)
    }
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = this.rendererConfig.debug.flightZoneColor
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
    const size = boid.getSize()

    const startX = this.canvasBox.start.x
    const startY = this.canvasBox.start.y

    const ctx = this.renderingContext
    ctx.save()

    ctx.translate(pos[0] - startX, pos[1] - startY)
    const angle = Math.atan2(vel[1], vel[0])
    ctx.rotate(angle)

    ctx.strokeStyle = `hsl(10, 10%, ${Math.max(10, 100 - (pos[2] / maxDepth) * 80)}%)`
    ctx.beginPath()
    // Define triangle
    ctx.moveTo(size, 0) // Nose
    ctx.lineTo(-size * 0.5, size * 0.3) // Right wing
    ctx.lineTo(-size * 0.5, -size * 0.3) // Left wing
    // Define center line (fold)
    ctx.moveTo(size, 0) // Nose
    ctx.lineTo(-size * 0.5, 0) // Tail center
    // Draw
    ctx.closePath()
    ctx.stroke()

    ctx.restore()
  }
}
