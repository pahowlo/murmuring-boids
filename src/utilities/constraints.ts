import { vec3 } from "gl-matrix"

/**
 * Limits the turn of a vector towards a desired direction by a maximum angle.
 * @param current - The current velocity vector.
 * @param desired - The desired direction vector.
 * @param maxAngle - The maximum angle in degrees that the current vector can turn towards the desired vector.
 * @returns A new vector that is the result of turning the current vector towards the desired vector by at most maxAngle.
 */
export function limitTurn(current: vec3, desired: vec3, maxAngle: number): vec3 {
  const maxAngleRad = (maxAngle * Math.PI) / 180
  const angle = Math.acos(vec3.dot(vec3.normalize(vec3.create(), current), vec3.normalize(vec3.create(), desired)))
  if (angle < maxAngleRad) {
    return vec3.clone(desired)
  }

  // Find rotation direction (sign)
  const cross = current[0] * desired[1] - current[1] * desired[0]
  const sign = cross < 0 ? -1 : 1
  // Rotate current by maxAngleRad toward desired
  const cos = Math.cos(maxAngle)
  const sin = Math.sin(maxAngleRad) * sign
  const newVel = vec3.fromValues(current[0] * cos - current[1] * sin, current[0] * sin + current[1] * cos, 0)
  vec3.normalize(newVel, newVel)
  return newVel
}
