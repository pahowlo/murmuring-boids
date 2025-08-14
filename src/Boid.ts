import { vec3 } from "gl-matrix"

import type { BoidConfig } from "./config"
import { limitTurn } from "./utilities/constraints"
import { closestOrthogonalDirectionToPolygon } from "./utilities/polygon"
import { FlightZone } from "./FlightZone"

export const defaultBoidConfig: BoidConfig = {
  minSpeed: 1,
  maxSpeed: 5,
  maxTurnAngleDeg: 140,
  acceleration: {
    backToFlightZone: 1.2,
    stayCloseToCenterOwfMass: 0.1,
    followCentroids: 1.6,
    pullUpTerrain: 1.8,
    cohesion: 0.4,
    alignment: 1,
    separation: 1.8,
  },
}

// Main class
export class Boid {
  readonly displayId: number
  private position: vec3
  private velocity: vec3
  private acceleration: vec3

  private config: BoidConfig

  private lastPositionInside?: vec3
  private isOutside: boolean = false
  private backToFlightZone?: {
    direction: vec3
    remainingTicks: number
  }
  private followCentroids?: {
    direction: vec3
    remainingTicks: number
  }

  constructor(displayId: number, position: vec3, boidConfig: Partial<BoidConfig> = {}) {
    this.displayId = displayId
    this.config = {
      ...boidConfig,
      ...defaultBoidConfig,
    }

    const theta = Math.random() * 2 * Math.PI
    this.position = position
    this.velocity = vec3.fromValues(
      Math.cos(theta) * 0.5,
      Math.sin(theta) * 0.5,
      Math.random() - 0.5,
    )
    vec3.scale(this.velocity, this.velocity, this.config.maxSpeed)
    this.acceleration = vec3.create()
  }

  getPosition(): Readonly<vec3> {
    return this.position
  }
  getVelocity(): Readonly<vec3> {
    return this.velocity
  }
  getConfig(): Readonly<BoidConfig> {
    return this.config
  }

  update(
    neighbors: Boid[],
    closeNeighbors: Boid[],
    closeRadius: number,
    centerOwMass: vec3,
    flightZone: FlightZone,
    maxHeight: number,
    visibleDistance: number,
    visibleDepth: number,
    randomSeed: number,
    gravity: vec3,
  ): void {
    let maxTurnAngleDeg = this.config.maxTurnAngleDeg
    let maxSpeed = this.config.maxSpeed

    const boidAcceleration = vec3.create()

    // == Maneuvers
    // Pull up if low terrain
    if (this.position[1] >= maxHeight) {
      boidAcceleration[1] = -this.config.acceleration.pullUpTerrain
      // Allow more freedom to pull up
      maxTurnAngleDeg += 20
      maxSpeed += 1
    }

    // Boundary check: Get back to flight zone if outside
    const polygon = flightZone.getPolygon()

    if (!this.backToFlightZone) {
      const wasOutside = this.isOutside
      this.isOutside = flightZone.isOutside(this.position)
      if (!this.isOutside) {
        this.lastPositionInside = vec3.clone(this.position)
      } else {
        const turnBackDirection = vec3.create()

        if (!wasOutside) {
          // Go the opposite direction
          const closestOrthoDir = closestOrthogonalDirectionToPolygon(polygon, this.position)
          vec3.copy(turnBackDirection, closestOrthoDir)
        } else {
          // Check if last known inside position is still a good option
          if (this.lastPositionInside && flightZone.isOutside(this.lastPositionInside)) {
            this.lastPositionInside = undefined // No way back
          }
          vec3.subtract(
            turnBackDirection,
            // Fallback: aim for random polygon vertex
            this.lastPositionInside ?? polygon[Math.floor(randomSeed * polygon.length)],
            this.position,
          )
        }

        vec3.normalize(turnBackDirection, turnBackDirection)
        this.backToFlightZone = {
          direction: turnBackDirection,
          remainingTicks: 10,
        }
      }
    }
    if (this.backToFlightZone) {
      vec3.scaleAndAdd(
        boidAcceleration,
        boidAcceleration,
        this.backToFlightZone.direction,
        this.config.acceleration.backToFlightZone,
      )
      this.backToFlightZone.remainingTicks--
      if (this.backToFlightZone.remainingTicks <= 0) {
        this.backToFlightZone = undefined
      }
    }

    // Centroid attraction: Converge towards closest visible centroids if any
    const centroids = flightZone.getCentroids()

    if (!this.followCentroids && centroids.length > 0) {
      const followDirection = vec3.create()
      for (const point of centroids) {
        const vec = vec3.subtract(vec3.create(), point, this.position)
        const manDist = Math.abs(vec[0]) + Math.abs(vec[1])
        if (manDist >= visibleDistance) {
          continue // Not visible
        }
        vec3.scale(vec, vec, (visibleDistance - manDist) / manDist)
        vec3.add(followDirection, followDirection, vec)
      }
      vec3.normalize(followDirection, followDirection)
      this.followCentroids = {
        direction: followDirection,
        remainingTicks: 5,
      }
    }
    if (this.followCentroids) {
      vec3.scaleAndAdd(
        boidAcceleration,
        boidAcceleration,
        this.followCentroids.direction,
        this.config.acceleration.followCentroids,
      )
      this.followCentroids.remainingTicks--
      if (this.followCentroids.remainingTicks <= 0) {
        this.followCentroids = undefined
      }
    }

    // Stay close to center of mass of all boids
    const diffCenterOwMass = vec3.subtract(vec3.create(), centerOwMass, this.position)
    vec3.normalize(diffCenterOwMass, diffCenterOwMass)
    vec3.scaleAndAdd(
      boidAcceleration,
      boidAcceleration,
      diffCenterOwMass,
      this.config.acceleration.stayCloseToCenterOwfMass,
    )

    // Cohesion and alignment: Stay with the flock
    vec3.add(boidAcceleration, boidAcceleration, this.cohesionAcceleration(neighbors))
    vec3.add(
      boidAcceleration,
      boidAcceleration,
      this.alignmentAcceleration(neighbors, visibleDepth),
    )

    // Separation: Avoid collisions with neighbors
    vec3.add(
      boidAcceleration,
      boidAcceleration,
      this.separationAcceleration(closeNeighbors, closeRadius, visibleDepth),
    )

    // == Environment
    // Reset acceleration with truncated self acceleration
    limitTurn(this.acceleration, this.velocity, boidAcceleration, maxTurnAngleDeg)

    // Apply gravity
    if (!this.isOutside) {
      vec3.add(this.acceleration, this.acceleration, gravity)
    }

    // == Update
    // Update velocity
    const newVelocity = vec3.create()
    vec3.add(newVelocity, this.velocity, this.acceleration)

    const newSpeed = vec3.length(newVelocity)
    if (newSpeed >= 0.1) {
      this.velocity = newVelocity
      if (newSpeed > maxSpeed) {
        // Normalize to max speed if too fast
        vec3.scale(this.velocity, this.velocity, maxSpeed / newSpeed)
      } else if (newSpeed < this.config.minSpeed) {
        // Normalize to min speed if too slow
        vec3.scale(this.velocity, this.velocity, this.config.minSpeed / newSpeed)
      }
    }
    // Otherwise, stay on course. Discard updated velocity
    // Update position
    this.position = vec3.add(this.position, this.position, this.velocity)
  }

  /**
   * Acceleration to match direction and speed of nearby neighbors.
   * To match velocity of the flock.
   */
  private alignmentAcceleration(neighbors: Boid[], visibleDepth: number): vec3 {
    const alignment = vec3.create()
    for (const neighbor of neighbors) {
      const zDiff = Math.abs(neighbor.getPosition()[2] - this.position[2])
      if (zDiff > visibleDepth) {
        // Ignore neighbors that are too far along z-axis
        continue
      }
      vec3.add(alignment, alignment, neighbor.getVelocity())
    }
    vec3.normalize(alignment, alignment)
    vec3.scale(alignment, alignment, this.config.acceleration.alignment)
    return alignment
  }

  /**
   * Acceleration to move towards the center of mass of the visible boids.
   * To stay with the flock.
   */
  private cohesionAcceleration(visibleFlock: Boid[]): vec3 {
    const cohesion = vec3.create()
    for (const neighbor of visibleFlock) {
      const cohesionDir = vec3.subtract(vec3.create(), neighbor.getPosition(), this.position)
      vec3.add(cohesion, cohesion, cohesionDir)
    }
    vec3.normalize(cohesion, cohesion)
    vec3.scale(cohesion, cohesion, this.config.acceleration.cohesion)
    return cohesion
  }

  /**
   * Get a random position in the flight zone.
   */
  private separationAcceleration(
    closeNeighbors: Boid[],
    closeRadius: number,
    visibleDepth: number,
  ): vec3 {
    const visibleRadius = Math.max(closeRadius, visibleDepth)

    const separation = vec3.create()
    for (const neighbor of closeNeighbors) {
      const separationDir = vec3.subtract(vec3.create(), this.position, neighbor.getPosition())
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
    vec3.scale(separation, separation, this.config.acceleration.separation)
    return separation
  }
}
