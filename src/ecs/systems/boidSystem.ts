import { vec3 } from "gl-matrix"
import type { FlightZone } from "../../FlightZone"
import { limitTurn } from "../../utilities/constraints"
import { closestOrthogonalDirectionToPolygon } from "../../utilities/polygon"
import type { BoidArchetype } from "../components"
import type { Entity } from "../World"

export type BoidContext = {
  closeRadius: number
  centerOwMass: vec3
  flightZone: FlightZone
  maxHeight: number
  visibleDistance: number
  visibleDepth: number
  randomSeed: number
  gravity: vec3
}

/** Read position/velocity of any positioned entity (incl. detached ones). */
export type TransformReader = {
  position(entity: Entity): Readonly<vec3>
  velocity(entity: Entity): Readonly<vec3>
}

// Scratch vectors. No allocation per tick.
const boidAcceleration = vec3.create()
const tmp = vec3.create()
const sum = vec3.create()
const newVelocity = vec3.create()

/** Update a single boid in place. */
export function updateBoid(
  boids: BoidArchetype,
  row: number,
  neighbors: Entity[],
  closeNeighbors: Entity[],
  transforms: TransformReader,
  ctx: BoidContext,
): void {
  const v = boids.views
  const config = boids.objects[row]
  const position = v.position[row]
  const velocity = v.velocity[row]
  const acceleration = v.acceleration[row]
  const lastPositionInside = v.lastPositionInside[row]
  const backToFlightZoneDirection = v.backToFlightZoneDirection[row]
  const followCentroidsDirection = v.followCentroidsDirection[row]
  const c = boids.columns

  let maxTurnAngleDeg = config.maxTurnAngleDeg
  let maxSpeed = config.maxSpeed

  vec3.zero(boidAcceleration)

  // == Maneuvers
  // Pull up if low terrain
  if (position[1] >= ctx.maxHeight) {
    boidAcceleration[1] = -config.acceleration.pullUpTerrain
    // Allow more freedom to pull up
    maxTurnAngleDeg += 20
    maxSpeed += 1
  }

  // Boundary check: Get back to flight zone if outside
  const flightZone = ctx.flightZone
  const polygon = flightZone.getPolygon()

  if (c.backToFlightZoneTicks[row] <= 0) {
    const wasOutside = c.isOutside[row] === 1
    const isOutside = flightZone.isOutside(position)
    c.isOutside[row] = isOutside ? 1 : 0
    if (!isOutside) {
      vec3.copy(lastPositionInside, position)
      c.hasLastPositionInside[row] = 1
    } else {
      const turnBackDirection = backToFlightZoneDirection

      if (!wasOutside) {
        // Go the opposite direction
        const closestOrthoDir = closestOrthogonalDirectionToPolygon(polygon, position)
        vec3.copy(turnBackDirection, closestOrthoDir)
      } else {
        // Check if last known inside position is still a good option
        if (c.hasLastPositionInside[row] === 1 && flightZone.isOutside(lastPositionInside)) {
          c.hasLastPositionInside[row] = 0 // No way back
        }
        vec3.subtract(
          turnBackDirection,
          // Fallback: aim for random polygon vertex
          c.hasLastPositionInside[row] === 1
            ? lastPositionInside
            : polygon[Math.floor(ctx.randomSeed * polygon.length)],
          position,
        )
      }

      vec3.normalize(turnBackDirection, turnBackDirection)
      c.backToFlightZoneTicks[row] = 10
    }
  }
  if (c.backToFlightZoneTicks[row] > 0) {
    vec3.scaleAndAdd(
      boidAcceleration,
      boidAcceleration,
      backToFlightZoneDirection,
      config.acceleration.backToFlightZone,
    )
    c.backToFlightZoneTicks[row]--
    // Smoother U-turn when going back to the flight zone
    maxTurnAngleDeg = Math.min(maxTurnAngleDeg, 90)
  }

  // Centroid attraction: Converge towards closest visible centroids if any
  const centroids = flightZone.getCentroids()

  if (c.followCentroidsTicks[row] <= 0 && centroids.length > 0) {
    const followDirection = vec3.zero(followCentroidsDirection)
    for (const point of centroids) {
      const vec = vec3.subtract(tmp, point, position)
      vec[2] = 0 // Ignore in the case of centroids
      const manDist = Math.abs(vec[0]) + Math.abs(vec[1])
      if (manDist >= ctx.visibleDistance) {
        continue // Not visible
      }
      vec3.scale(vec, vec, (ctx.visibleDistance - manDist) / manDist)
      vec3.add(followDirection, followDirection, vec)
    }
    vec3.normalize(followDirection, followDirection)
    c.followCentroidsTicks[row] = 5
  }
  if (c.followCentroidsTicks[row] > 0) {
    vec3.scaleAndAdd(boidAcceleration, boidAcceleration, followCentroidsDirection, config.acceleration.followCentroids)
    c.followCentroidsTicks[row]--
  }

  // Stay close to center of mass of all boids
  const diffCenterOwMass = vec3.subtract(tmp, ctx.centerOwMass, position)
  vec3.normalize(diffCenterOwMass, diffCenterOwMass)
  vec3.scaleAndAdd(boidAcceleration, boidAcceleration, diffCenterOwMass, config.acceleration.stayCloseToCenterOwfMass)

  // Cohesion and alignment: Stay with the flock
  vec3.add(
    boidAcceleration,
    boidAcceleration,
    cohesionAcceleration(position, neighbors, transforms, config.acceleration.cohesion),
  )
  vec3.add(
    boidAcceleration,
    boidAcceleration,
    alignmentAcceleration(position, neighbors, transforms, ctx.visibleDepth, config.acceleration.alignment),
  )

  // Separation: Avoid collisions with neighbors
  vec3.add(
    boidAcceleration,
    boidAcceleration,
    separationAcceleration(
      position,
      closeNeighbors,
      transforms,
      ctx.closeRadius,
      ctx.visibleDepth,
      config.acceleration.separation,
    ),
  )

  // == Environment
  // Reset acceleration with truncated self acceleration
  limitTurn(acceleration, velocity, boidAcceleration, maxTurnAngleDeg)

  // Apply gravity
  if (c.isOutside[row] === 0) {
    vec3.add(acceleration, acceleration, ctx.gravity)
  }

  // == Update
  // Update velocity
  vec3.add(newVelocity, velocity, acceleration)

  const newSpeed = vec3.length(newVelocity)
  if (newSpeed >= 0.1) {
    vec3.copy(velocity, newVelocity)
    if (newSpeed > maxSpeed) {
      // Normalize to max speed if too fast
      vec3.scale(velocity, velocity, maxSpeed / newSpeed)
    } else if (newSpeed < config.minSpeed) {
      // Normalize to min speed if too slow
      vec3.scale(velocity, velocity, config.minSpeed / newSpeed)
    }
  }
  // Otherwise, stay on course. Discard updated velocity
  // Update position
  vec3.add(position, position, velocity)
}

/**
 * Acceleration to match direction and speed of nearby neighbors.
 * To match velocity of the flock.
 */
function alignmentAcceleration(
  position: vec3,
  neighbors: Entity[],
  transforms: TransformReader,
  visibleDepth: number,
  factor: number,
): vec3 {
  const alignment = vec3.zero(sum)
  for (const neighbor of neighbors) {
    const zDiff = Math.abs(transforms.position(neighbor)[2] - position[2])
    if (zDiff > visibleDepth) {
      // Ignore neighbors that are too far along z-axis
      continue
    }
    vec3.add(alignment, alignment, transforms.velocity(neighbor))
  }
  vec3.normalize(alignment, alignment)
  vec3.scale(alignment, alignment, factor)
  return alignment
}

/**
 * Acceleration to move towards the center of mass of the visible boids.
 * To stay with the flock.
 */
function cohesionAcceleration(
  position: vec3,
  visibleFlock: Entity[],
  transforms: TransformReader,
  factor: number,
): vec3 {
  const cohesion = vec3.zero(sum)
  for (const neighbor of visibleFlock) {
    const cohesionDir = vec3.subtract(tmp, transforms.position(neighbor), position)
    vec3.add(cohesion, cohesion, cohesionDir)
  }
  vec3.normalize(cohesion, cohesion)
  vec3.scale(cohesion, cohesion, factor)
  return cohesion
}

/**
 * Get a random position in the flight zone.
 */
function separationAcceleration(
  position: vec3,
  closeNeighbors: Entity[],
  transforms: TransformReader,
  closeRadius: number,
  visibleDepth: number,
  factor: number,
): vec3 {
  const visibleRadius = Math.max(closeRadius, visibleDepth)

  const separation = vec3.zero(sum)
  for (const neighbor of closeNeighbors) {
    const separationDir = vec3.subtract(tmp, position, transforms.position(neighbor))
    if (Math.abs(separationDir[2]) > visibleDepth) {
      // Ignore close neighbors that are too far along z-axis
      continue
    }
    let dist = vec3.length(separationDir)
    if (dist <= 1e-6) {
      dist = 10
      vec3.random(separationDir, dist)
    }
    vec3.scaleAndAdd(separation, separation, separationDir, visibleRadius / dist - 1)
  }

  vec3.normalize(separation, separation)
  vec3.scale(separation, separation, factor)
  return separation
}
