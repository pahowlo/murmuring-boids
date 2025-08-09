import { vec2 } from "gl-matrix"

import { validatePolygon } from "../utilities/polygon"

export const PolygonState = {
  NULL: null,
  FAILED: "failed",
  DRAWING: "drawing",
  CLOSED: "closed",
} as const
export type PolygonState = (typeof PolygonState)[keyof typeof PolygonState]

export class PolygonDrawer {
  private canvas: HTMLCanvasElement
  readonly CLOSING_RADIUS = 10 // CSS pixels

  private polygonOnCanvas: vec2[] = []
  private _state: PolygonState = null
  private _eTag: number = 0 // Incremented on every change

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // Make canvas focusable
    this.canvas.tabIndex = 0
    this.setupListeners(canvas)
  }

  private get state(): PolygonState {
    return this._state
  }
  private set state(newState: PolygonState) {
    this._state = newState
    this._eTag++
    switch (newState) {
      case "closed": {
        const validatedPolygon = validatePolygon(this.polygonOnCanvas)
        if (validatedPolygon) {
          this.polygonOnCanvas = validatedPolygon
          return
        }
        this._state = "failed"
        break
      }
    }
  }

  getState(): { state: PolygonState; eTag: number } {
    return { state: this.state, eTag: this._eTag }
  }
  getPolygonOnCanvas(): vec2[] {
    return this.polygonOnCanvas
  }

  private setupListeners(canvas: HTMLCanvasElement): void {
    let clickTimeoutId: number = 0

    canvas.addEventListener("click", (e) => {
      if (clickTimeoutId) return // Prevent click spamming

      const dblclickThreshold = this.polygonOnCanvas.length > 0 ? 200 : 0

      clickTimeoutId = setTimeout(() => {
        clickTimeoutId = 0 // reset
        const canvasPt = vec2.fromValues(e.clientX, e.clientY)

        switch (this.state) {
          case null:
          case "failed":
          case "closed": {
            // Start a new polygon
            this.polygonOnCanvas = [canvasPt]
            this.state = "drawing"
            break
          }
          case "drawing": {
            const start = this.polygonOnCanvas[0]
            const manDist = Math.abs(canvasPt[0] - start[0]) + Math.abs(canvasPt[1] - start[1])
            if (manDist <= this.CLOSING_RADIUS) {
              // Close polygon since we clicked near the starting point
              this.state = "closed"
              break
            }
            // Add point to polygon
            this.polygonOnCanvas.push(canvasPt)
            break
          }
          default:
            throw new Error(`Unexpected polygon state: ${this.state}`)
        }
      }, dblclickThreshold)
    })

    canvas.addEventListener("dblclick", () => {
      if (clickTimeoutId) {
        clearTimeout(clickTimeoutId)
        clickTimeoutId = 0
      }
      switch (this.state) {
        case null:
          // Nothing to do
          break

        case "failed":
        case "closed":
          // Erase polygon
          this.polygonOnCanvas = []
          this.state = null
          break

        case "drawing":
          // Close polygon
          this.state = "closed"
          break

        default:
          throw new Error(`Unexpected polygon state: ${this.state}`)
      }
    })
  }
}
