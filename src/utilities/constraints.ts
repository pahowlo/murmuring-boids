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

  // Check if max turn angle is exceeded by the acceleration
  const maxAngleRad = (maxAngle * Math.PI) / 180
  const angleRad = vec3.angle(normalizedDir, vec3.normalize(vec3.create(), acceleration))
  if (angleRad < maxAngleRad) {
    vec3.copy(out, acceleration)
    return // Nothing to do
  }

  // Get sign of rotation angle
  const sign = angleRad >= 0 ? 1 : -1

  // 2D Rotate direction by to max angle in that rotation direction
  const cos = Math.cos(maxAngleRad)
  const sin = Math.sin(maxAngleRad) * sign
  vec3.set(
    out,
    normalizedDir[0] * cos - normalizedDir[1] * sin,
    normalizedDir[0] * sin + normalizedDir[1] * cos,
    0,
  )

  // Finally, scale to match acceleration
  vec3.scale(out, out, vec3.length(acceleration))
}
