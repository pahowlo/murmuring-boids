import { vec3 } from "gl-matrix"

import { isInPolygon } from "./utilities/rayCasting2D"

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
  private canvasBox: Box

  paddingRatio: number
  maxDepth: number
  private polygon: vec3[]
  private centroids: vec3[]

  constructor(canvasBox: Box, maxDepth: number, paddingRatio: number = 0.1) {
    this.canvasBox = canvasBox
    this.paddingRatio = paddingRatio
    this.maxDepth = maxDepth

    this.polygon = this.defaultPolygon()
    this.centroids = []
  }

  // Polygon
  private defaultPolygon(): vec3[] {
    const z = this.maxDepth / 2
    const pad = Math.min(
      this.canvasBox.width * this.paddingRatio,
      this.canvasBox.height * this.paddingRatio,
    )
    const defaultPolygon = [
      // left-top
      vec3.fromValues(this.canvasBox.start.x + pad, this.canvasBox.start.y + pad, z),
      // right-top
      vec3.fromValues(this.canvasBox.end.x - pad, this.canvasBox.start.y + pad, z),
      // right-bottom
      vec3.fromValues(this.canvasBox.end.x - pad, this.canvasBox.end.y - pad, z),
      // left-bottom
      vec3.fromValues(this.canvasBox.start.x + pad, this.canvasBox.end.y - pad, z),
    ]
    return defaultPolygon
  }

  getPolygon(): Readonly<vec3[]> {
    return this.polygon
  }
  resetPolygon(): void {
    this.polygon = this.defaultPolygon()
  }

  // Centroids
  getCentroids(): Readonly<vec3[]> {
    return this.centroids
  }
  addCentroid(pointOnCanvas: vec3): void {
    const point = vec3.clone(pointOnCanvas)
    point[0] += this.canvasBox.start.x
    point[1] += this.canvasBox.start.y
    point[2] = Math.max(0, Math.min(this.maxDepth, point[2]))

    this.centroids.push(point)
  }
  clearCentroids(): void {
    // Fast empty list
    this.centroids.length = 0
  }

  // Methods
  /** Returns true if the position is outside the flight zone
   * defined by its 2D polygon and depth.
   */
  isOutside(position: vec3): boolean {
    const z = position[2]
    return z > this.maxDepth || z < 0 || !isInPolygon(position, this.polygon)
  }

  /** Translates and scales every vertex of the polygon and every centroid
   * to fit into the new box. */
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
