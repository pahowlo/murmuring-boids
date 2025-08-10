import { vec2, vec3 } from "gl-matrix"

/**
 * Return new polygon after removing duplicate points and collinear segments,
 * or undefined if it was found valid during the process.
 *
 * @param polygon List of ordered vertices defining the polygon edges
 * @param minDistance Minimum distance between two vertices of an edge to consider them as distinct
 */
export function validatePolygon<T extends vec2 | vec3>(
  polygon: T[],
  minDistance: number = 10,
): T[] | undefined {
  const n = polygon.length
  if (n < 3) {
    return undefined // Not a valid polygon
  }
  const newPolygon: T[] = []

  let prevSegDir = [-Infinity, -Infinity]

  for (let idx = 0; idx < n; idx++) {
    const nextIdx = idx === n - 1 ? 0 : idx + 1

    const point = polygon[idx]
    const nextPoint = polygon[nextIdx]
    // Check if duplicated point
    const manDist = Math.abs(point[0] - nextPoint[0]) + Math.abs(point[1] - nextPoint[1])
    // Max manhattan distance on circle is: radius * sqrt(2) ~ 1.414 (45 degrees angle)
    if (manDist <= minDistance * 1.414) {
      continue // Skip
    }
    // Skip if collinear segment
    const segDir = segmentDirection(point, nextPoint)
    if (prevSegDir[0] === segDir[0] && prevSegDir[1] === segDir[1]) {
      continue // Skip
    }
    prevSegDir = segDir

    newPolygon.push(point)
  }

  if (newPolygon.length < 3) {
    return undefined // Not a valid polygon
  }
  return newPolygon
}

function segmentDirection<T extends vec2 | vec3>(start: T, end: T): [number, number] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const maxDist = Math.max(Math.abs(dx), Math.abs(dy))
  return [dx / maxDist, dy / maxDist]
}

/**
 * Find the closest orthogonal direction to a polygon edge from a given position.
 * No segment limit here, polygon edges are considered as infinite lines.
 */
export function closestOrthogonalDirectionToPolygon(
  polygon: vec3[] | Readonly<vec3[]>,
  position: vec3,
): vec3 {
  let minDist = Infinity
  let closestOrthoVec = vec3.create()

  const n = polygon.length
  if (n === 0) {
    throw new Error("Polygon must have at least one vertex")
  }

  // Find closest edge to position
  for (let i = 0; i < n; i++) {
    const start = polygon[i]
    const end = polygon[i !== n - 1 ? i + 1 : 0]

    const edgeDir = [end[0] - start[0], end[1] - start[1]]
    // Orthogonal direction (right-hand)
    const edgeOrthoDir = [-edgeDir[1], edgeDir[0]]

    // Parametric: a + t*edge = position + s*ortho
    // Solve for t and s
    const det = edgeDir[0] * edgeOrthoDir[1] - edgeDir[1] * edgeOrthoDir[0]
    if (det < 1e-6) {
      // Polygon contains a very small edge, skip
      continue
    }

    const dx = position[0] - start[0]
    const dy = position[1] - start[1]

    // Cramer's rule
    const t = (dx * edgeOrthoDir[1] - dy * edgeOrthoDir[0]) / det

    // Intersection point on edge line
    const orthoVec = vec3.fromValues(
      start[0] + t * edgeDir[0] - position[0],
      start[1] + t * edgeDir[1] - position[1],
      0,
    )
    const manDist = Math.abs(orthoVec[0]) + Math.abs(orthoVec[1])

    if (manDist < minDist) {
      minDist = manDist
      closestOrthoVec = orthoVec
    }
  }
  return closestOrthoVec!
}
