import { vec2 } from "gl-matrix"

export class MouseStatus {
  private canvas: HTMLCanvasElement

  private positionOnCanvas?: vec2
  private isPressed: boolean = false
  private isMouseOver: boolean = true

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // Make canvas focusable
    this.canvas.tabIndex = 0
    this.setupListeners(canvas)
  }

  isMousePressed(): boolean {
    return this.isPressed && this.isMouseOver
  }
  isMouseFocused(): boolean {
    return this.isMouseOver
  }

  getPositionOnCanvas(): vec2 | undefined {
    if (this.isMouseFocused() && this.positionOnCanvas) {
      return this.positionOnCanvas
    }
    return undefined
  }

  private setupListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("focus", () => {
      this.isMouseOver = true
    })
    canvas.addEventListener("mouseenter", () => {
      this.isMouseOver = true
    })
    canvas.addEventListener("mouseover", () => {
      this.isMouseOver = true
    })
    canvas.addEventListener("mouseleave", () => {
      this.isMouseOver = false
      this.isPressed = false
      this.positionOnCanvas = undefined
    })
    canvas.addEventListener("mousemove", (e) => {
      this.isMouseOver = true
      const newPositionOnCanvas = vec2.fromValues(e.clientX, e.clientY)
      this.positionOnCanvas = newPositionOnCanvas
    })

    canvas.addEventListener("mousedown", () => {
      this.isPressed = true
    })
    canvas.addEventListener("mouseup", () => {
      this.isPressed = false
    })
  }
}
