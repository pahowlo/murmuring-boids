// Utility for interactively creating and resetting a polygon zone (flightZone)

export type ZoneCallback = (zone: { points: [number, number][] }) => void

export const defaultZone: [number, number][] = [
  [50, 50],
  [250, 50],
  [250, 250],
  [50, 250],
]

export class FlightZone {
  zone: [number, number][]
  readonly defaultZone: [number, number][]
  private canvas: HTMLCanvasElement
  private cleanup: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, defaultZone: [number, number][]) {
    this.canvas = canvas
    this.defaultZone = [...defaultZone]
    this.zone = [...defaultZone]
  }

  enable(onZoneChange: ZoneCallback) {
    let points: [number, number][] = [...this.zone]
    const handleClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      points.push([x, y])
      this.zone = [...points]
      onZoneChange({ points: this.zone })
    }
    const handleDoubleClick = () => {
      points = [...this.defaultZone]
      this.zone = [...this.defaultZone]
      onZoneChange({ points: this.zone })
    }
    this.canvas.addEventListener("click", handleClick)
    this.canvas.addEventListener("dblclick", handleDoubleClick)
    this.cleanup = () => {
      this.canvas.removeEventListener("click", handleClick)
      this.canvas.removeEventListener("dblclick", handleDoubleClick)
    }
  }

  disable() {
    if (this.cleanup) this.cleanup()
  }
}
