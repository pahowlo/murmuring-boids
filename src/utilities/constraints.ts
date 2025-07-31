import { vec3 } from "gl-matrix"

/**
 * Limits the angle of acceleration for a smoother turn.
 * @param out - The output where the result is stored.
 * @param velocity - The velocity vector. It is normalized before truncating the acceleration angle.
 * @param acceleration - The acceleration vector.
 * @param maxAngle - The maximum angle in degrees of the turn
 */
export function limitTurn(out: vec3, velocity: vec3, acceleration: vec3, maxAngle: number): void {
  // Get current pointing direction of the velocity
  const direction = vec3.normalize(vec3.create(), velocity)

  // Check if max turn angle is exceeded by the acceleration
  const maxAngleRad = (maxAngle * Math.PI) / 180
  const crossProduct = vec3.dot(vec3.normalize(vec3.create(), direction), vec3.normalize(vec3.create(), acceleration))
  const angleRad = Math.acos(crossProduct)
  if (angleRad < maxAngleRad) {
    vec3.copy(out, acceleration)
    return // Nothing to do
  }

  // Truncate the acceleration to the max angle
  // First, find sign of rotation angle
  const sign = crossProduct >= 0 ? 1 : -1

  // Then, rotate direction by to max angle in that rotation direction
  const cos = Math.cos(maxAngleRad)
  const sin = Math.sin(maxAngleRad) * sign
  vec3.set(out, direction[0] * cos - direction[1] * sin, direction[0] * sin + direction[1] * cos, 0)

  // Finally, scale back to match original acceleration
  vec3.scale(out, out, vec3.length(acceleration))
}
