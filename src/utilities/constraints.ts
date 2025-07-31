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

  // Calculate interpolation factor to limit to maxAngle.
  // Linear interpolation (lerp) can underestimate the angle up to 15% for 120 degrees 
  // hence the manual adjustment.
  // TODO: implement spherical interpolation (slerp) to avoid this.
  const t = (maxAngleRad + 20) / angleRad

  // Spherically interpolate between velocity direction and acceleration direction
  vec3.lerp(out, normalizedDir, normalizedAccel, t)

  // Finally, scale to match acceleration
  vec3.normalize(out, out) // Lerp doesn't preserve length
  vec3.scale(out, out, vec3.length(acceleration))
}
