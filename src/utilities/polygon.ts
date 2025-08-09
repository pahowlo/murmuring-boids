import { vec2, vec3 } from "gl-matrix"

/**
 * Return new polygon after removing duplicate points and collinear segments,
 * or undefined if it was found valid during the process.
 */
export function validatePolygon<T extends vec2 | vec3>(polygon: T[]): T[] | undefined {
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
    // Check if duplicate point
    if (point[0] === nextPoint[0] && point[1] === nextPoint[1]) {
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
