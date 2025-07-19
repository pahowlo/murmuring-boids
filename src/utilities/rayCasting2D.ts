import { vec2, vec3 } from "gl-matrix"

export { isInPolygon }

/**
 * Check if the position is inside a 2D polygon using the 2D ray casting algorithm.
 * It works for both convex and non-convex (concave) polygons.
 *
 * @param position - The point to check.
 * @param polygon - Array of vertices defining the polygon.
 */
function isInPolygon(position: vec2 | vec3, polygon: vec2[]): boolean {
  if (polygon.length < 3) {
    return false // Not a valid polygon
  }

  let isInside = false
  const x = position[0]
  const y = position[1]

  // Cast a ray horizontally to the right from position.
  // If the position is inside the polygon, the ray should cross an odd number of polygon edges.
  // Instead of counting, we toggle isInside at each intersection found.
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    // For each edge
    const x1 = polygon[i][0]
    const y1 = polygon[i][1]
    const x2 = polygon[j][0]
    const y2 = polygon[j][1]

    if (
      // Check if y is within vertical range.
      // Support equality only with start point to avoid double-counting intersections on polygon points
      y1 <= y === y < y2 &&
      // Previous check confirms an intersection with the horizontal line crossing position.
      // Verify if x is left of the edge, since we cast the ray to the right.
      x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1
    ) {
      // New intersection found
      isInside = !isInside
    }
  }

  return isInside
}
