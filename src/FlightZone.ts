import { vec3 } from "gl-matrix"

export class Box {
  readonly start: { x: number; y: number }
  readonly end: { x: number; y: number }
  readonly width: number
  readonly height: number

  constructor(startX: number, startY: number, width: number, height: number) {
    this.start = { x: startX, y: startY }
    this.end = { x: startX + width, y: startY + height }
    this.width = width
    this.height = height
  }

  equals(o: Box): boolean {
    return (
      this.start.x === o.start.x &&
      this.start.y === o.start.y &&
      this.width === o.width &&
      this.height === o.height
    )
  }
}

// Main class
export class FlightZone {
  polygon: vec3[]
  centroids: vec3[]

  private canvasBox: Box

  constructor(canvasBox: Box, paddingRatio: number = 0.15) {
    const padding = Math.min(canvasBox.width * paddingRatio, canvasBox.height * paddingRatio)
    this.polygon = [
      // left-top
      vec3.fromValues(canvasBox.start.x + padding, canvasBox.start.y + padding, 0),
      // right-top
      vec3.fromValues(canvasBox.end.x - padding, canvasBox.start.y + padding, 0),
      // right-bottom
      vec3.fromValues(canvasBox.end.x - padding, canvasBox.end.y - padding, 0),
      // left-bottom
      vec3.fromValues(canvasBox.start.x + padding, canvasBox.end.y - padding, 0),
    ]
    this.centroids = [this.getCenter()]

    this.canvasBox = canvasBox
  }

  getCenter(): vec3 {
    return vec3.fromValues(
      this.polygon.reduce((sum, v) => sum + v[0], 0) / this.polygon.length,
      this.polygon.reduce((sum, v) => sum + v[1], 0) / this.polygon.length,
      0,
    )
  }

  /**
   * Translates and scales every vertex of the polygon and every centroid
   * to fit into the new box.
   */
  resize(newCanvasBox: Box): void {
    if (this.canvasBox.equals(newCanvasBox)) return // No resize required

    const scaleX =
      newCanvasBox.width === this.canvasBox.width ? 1 : newCanvasBox.width / this.canvasBox.width
    const scaleY =
      newCanvasBox.height === this.canvasBox.height
        ? 1
        : newCanvasBox.height / this.canvasBox.height

    // Polygon
    for (const point of this.polygon) {
      point[0] = (point[0] - this.canvasBox.start.x) * scaleX + newCanvasBox.start.x
      point[1] = (point[1] - this.canvasBox.start.y) * scaleY + newCanvasBox.start.y
    }

    // Centroids
    for (const point of this.centroids) {
      point[0] = (point[0] - this.canvasBox.start.x) * scaleX + newCanvasBox.start.x
      point[1] = (point[1] - this.canvasBox.start.y) * scaleY + newCanvasBox.start.y
    }

    // Update box
    this.canvasBox = newCanvasBox
  }
}
