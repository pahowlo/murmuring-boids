import { vec2 } from "gl-matrix"

import { validatePolygon } from "../utilities/polygon"

export const PolygonState = {
  NONE: "none",
  FAILED: "failed",
  DRAWING: "drawing",
  CLOSED: "closed",
} as const
export type PolygonState = (typeof PolygonState)[keyof typeof PolygonState]

export class PolygonDrawer {
  private canvas: HTMLCanvasElement
  readonly CLOSING_RADIUS = 10 // CSS pixels

  private polygonOnCanvas: vec2[]
  private _state: PolygonState
  private _eTag: number // Incremented on every change

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // Make canvas focusable
    this.canvas.tabIndex = 0

    this.polygonOnCanvas = []
    this._state = "none"
    this._eTag = 0
    this.setupListeners(canvas)
  }

  private getState(): PolygonState {
    return this._state
  }
  private updateState(newState: PolygonState): void {
    this._eTag++
    this._state = newState
    switch (newState) {
      case PolygonState.NONE: {
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

  getStateInfo(): { state: PolygonState; eTag: number } {
    return { state: this._state, eTag: this._eTag }
  }
  getPolygonOnCanvas(): vec2[] {
    return this.polygonOnCanvas
  }

  private setupListeners(canvas: HTMLCanvasElement): void {
    let clickInProgress: boolean = false

    canvas.addEventListener("click", (e) => {
      if (clickInProgress) return // Prevent click spamming

      clickInProgress = true
      try {
        const canvasPt = vec2.fromValues(e.clientX, e.clientY)

        const state = this.getState()
        switch (state) {
          case PolygonState.NONE:
          case PolygonState.FAILED:
          case PolygonState.CLOSED: {
            // Start a new polygon
            this.polygonOnCanvas = [canvasPt]
            this.updateState("drawing")
            break
          }

          case PolygonState.DRAWING: {
            const start = this.polygonOnCanvas[0]
            const manDist = Math.abs(canvasPt[0] - start[0]) + Math.abs(canvasPt[1] - start[1])
            if (manDist <= this.CLOSING_RADIUS) {
              // Close polygon since we clicked near the starting point
              this.updateState("closed")
              break
            }
            // Add point to polygon
            this.polygonOnCanvas.push(canvasPt)
            break
          }

          default:
            throw new Error(`Unexpected polygon state: ${state}`)
        }
      } finally {
        clickInProgress = false
      }
    })

    canvas.addEventListener("dblclick", () => {
      const state = this.getState()
      switch (state) {
        case PolygonState.NONE:
          // Nothing to do
          break

        case PolygonState.FAILED:
        case PolygonState.CLOSED:
          // Erase polygon
          this.polygonOnCanvas = []
          this.updateState("none")
          break

        case PolygonState.DRAWING:
          // Close polygon
          this.updateState("closed")
          break

        default:
          throw new Error(`Unexpected polygon state: ${state}`)
      }
    })
  }
}
