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
  const normalizedDir = vec3.normalize(vec3.create(), velocity)
  const normalizedAccel = vec3.normalize(vec3.create(), acceleration)

  // Check if max turn angle is exceeded by the acceleration
  const maxAngleRad = (maxAngle * Math.PI) / 180
  const angleRad = vec3.angle(normalizedDir, normalizedAccel)
  if (angleRad <= maxAngleRad) {
    vec3.copy(out, acceleration)
    return // Nothing to do
  }

  // Rotate velocity direction towards acceleration direction by exactly maxAngle (slerp).
  // Component of acceleration direction orthogonal to velocity direction:
  const ortho = vec3.scaleAndAdd(
    vec3.create(),
    normalizedAccel,
    normalizedDir,
    -vec3.dot(normalizedAccel, normalizedDir),
  )
  if (vec3.squaredLength(ortho) < 1e-12) {
    // Acceleration is exactly opposite: pick any perpendicular axis
    const axis = Math.abs(normalizedDir[0]) < 0.9 ? vec3.fromValues(1, 0, 0) : vec3.fromValues(0, 1, 0)
    vec3.cross(ortho, normalizedDir, axis)
  }
  vec3.normalize(ortho, ortho)

  vec3.scale(out, normalizedDir, Math.cos(maxAngleRad))
  vec3.scaleAndAdd(out, out, ortho, Math.sin(maxAngleRad))

  // Finally, scale to match acceleration
  vec3.scale(out, out, vec3.length(acceleration))
}
