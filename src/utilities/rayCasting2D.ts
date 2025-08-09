import { vec2, vec3 } from "gl-matrix"

export { isInPolygon }

/**
 * Check if the point is inside the polygon using 2D ray casting with ODD_EVEN strategy.
 * It works as visually expected for both convex and non-convex (concave) polygons,
 * but creates arbitrary results for self-intersecting shapes with inner polygons.
 * Another strategy that considers vertical orientation of edges would be NON_ZERO_WINDING.
 *
 * @param point    The point to check.
 * @param polygon  List of ordered vertices defining the polygon edges
 *                 without duplicates on straight lines.
 */
function isInPolygon(point: vec2 | vec3, polygon: vec2[] | vec3[]): boolean {
  if (polygon.length < 3) {
    return false // Not a valid polygon
  }

  // Consider edges and vertices of polygon as outside
  let isInside = false
  const x = point[0]
  const y = point[1]

  // Cast a ray horizontally to the right from point.
  // ODD_EVENT: Consider a point inside a polygon if any ray crosses an odd number of polygon edges.
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    // For each edge
    const x1 = polygon[i][0]
    const y1 = polygon[i][1]
    const x2 = polygon[j][0]
    const y2 = polygon[j][1]
    const yDiff = y2 - y1

    if (yDiff === 0) {
      // Check if x is within horizontal range
      if (x1 <= x === x < x2) {
        if (y1 === y) {
          // Point on edge, thus considered as outside
          return false
        }
      }
      // Otherwise, ignore flat edges.
      // If ray is intersecting, next edge will be counted instead.
      continue
    }

    // Check if y is within vertical range,
    // but excluding end point to double-counting ray intersections with vertices.
    if (y1 <= y === y < y2 && y !== y2) {
      const xRayInterect = ((x2 - x1) * (y - y1)) / yDiff + x1
      if (x === xRayInterect) {
        // Point on vertex, thus considered as outside
        return false
      }
      // Verify if x is left of the edge, since we cast the ray to the right.
      if (x < xRayInterect) {
        // New intersection found
        isInside = !isInside
      }
    }
  }
  // True if an odd number of intersections were found since we started at False
  return isInside
}
