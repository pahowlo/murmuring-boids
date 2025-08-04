import { vec3 } from "gl-matrix"

export class MouseInputs {
  private canvas: HTMLCanvasElement

  positionOnCanvas?: vec3
  private isPressed: boolean = false
  private isMouseOver: boolean = true

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // Make canvas focusable
    this.canvas.tabIndex = 0
    this.setupEventListeners(canvas)
  }

  isMousePressed(): boolean {
    return this.isPressed && this.isMouseOver
  }
  isMouseFocused(): boolean {
    return this.isMouseOver
  }
  private setupEventListeners(canvas: HTMLCanvasElement): void {
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

    canvas.addEventListener("mousemove", (event) => {
      this.isMouseOver = true
      const newPositionOnCanvas = vec3.fromValues(event.clientX, event.clientY, 50)
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
