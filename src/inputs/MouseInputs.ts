import { vec3 } from "gl-matrix"

export class MouseInputs {
  private canvas: HTMLCanvasElement

  positionOnCanvas?: vec3
  private isPressed: boolean = false
  private isFocused: boolean = true

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // Make canvas focusable
    this.canvas.tabIndex = 0
    this.setupEventListeners(this.canvas)
  }

  isMousePressed(): boolean {
    return this.isPressed
  }
  isMouseFocused(): boolean {
    return this.isFocused
  }

  private setupEventListeners(canvas: HTMLCanvasElement): void {
    // Focus
    canvas.addEventListener("mouseenter", () => {
      //canvas.focus()
    })

    canvas.addEventListener("focus", () => {
      this.isFocused = true
    })

    canvas.addEventListener("blur", () => {
      this.isFocused = false
      this.isPressed = false
      this.positionOnCanvas = undefined
    })

    canvas.addEventListener("mouseleave", () => {
      this.isFocused = false
      this.isPressed = false
      this.positionOnCanvas = undefined
    })

    // Mouse events
    canvas.addEventListener("mousemove", (event) => {
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
