import { vec3 } from "gl-matrix"

import type { BoidConfig } from "./config"
import { limitTurn } from "./utilities/constraints"
import { FlightZone } from "./FlightZone"

export const defaultBoidConfig: BoidConfig = {
  minSpeed: 1,
  maxSpeed: 6,
  maxTurnAngleDeg: 120,
  acceleration: {
    backToFlightZone: 0.6,
    followCentroids: 0.6,
    pullUpTerrain: 1.8,
    cohesion: 0.6,
    alignment: 1,
    separation: 1.2,
    gravity: 0.05, // Positive since (0, 0) is the top left corner
  },
}

// Main class
export class Boid {
  readonly displayId: number
  private position: vec3
  private velocity: vec3
  private acceleration: vec3

  private config: BoidConfig

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
      Math.cos(theta) * this.config.maxSpeed,
      Math.sin(theta) * this.config.maxSpeed,
      0,
    )
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
    cellRadius: number,
    flightZone: FlightZone,
    maxHeight: number,
    visibleRange: number,
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

    if (!this.backToFlightZone && flightZone.isOutside(this.position)) {
      const turnBackDirection = vec3.create()
      for (const point of polygon) {
        vec3.add(
          turnBackDirection,
          turnBackDirection,
          vec3.subtract(vec3.create(), point, this.position),
        )
      }
      vec3.normalize(turnBackDirection, turnBackDirection)
      this.backToFlightZone = {
        direction: turnBackDirection,
        remainingTicks: 30,
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

    // Centroid attraction: Get to centroids if defined
    const centroids = flightZone.getCentroids()

    if (!this.followCentroids && centroids.length > 0) {
      const followDirection = vec3.create()
      for (const point of centroids) {
        const diff = vec3.subtract(vec3.create(), point, this.position)
        const manhattanDist = Math.abs(diff[0]) + Math.abs(diff[1])
        const manhattanInvDist = visibleRange - manhattanDist
        if (manhattanInvDist <= 0) {
          continue
        }
        vec3.scale(diff, diff, manhattanInvDist / manhattanDist)
        vec3.add(followDirection, followDirection, diff)
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

    // Cohesion and alignment: Stay with the flock
    vec3.add(boidAcceleration, boidAcceleration, this.cohesionAcceleration(neighbors))
    vec3.add(boidAcceleration, boidAcceleration, this.alignmentAcceleration(neighbors))

    // Separation: Avoid collisions with neighbors
    vec3.add(
      boidAcceleration,
      boidAcceleration,
      this.separationAcceleration(closeNeighbors, cellRadius),
    )

    // == Environment
    // Reset acceleration with truncated self acceleration
    limitTurn(this.acceleration, this.velocity, boidAcceleration, maxTurnAngleDeg)

    this.acceleration[1] += this.config.acceleration.gravity // Apply gravity

    // == Update
    // Update velocity
    vec3.add(this.velocity, this.velocity, this.acceleration)

    if (vec3.length(this.velocity) > maxSpeed) {
      // Normalize to max speed if too fast
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, maxSpeed)
    } else if (vec3.length(this.velocity) < this.config.minSpeed) {
      // Normalize to min speed if too slow
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, this.config.minSpeed)
    }

    // Update position
    this.position = vec3.add(this.position, this.position, this.velocity)
  }

  /**
   * Acceleration to match direction and speed of nearby neighbors.
   * To match velocity of the flock.
   */
  private alignmentAcceleration(neighbors: Boid[]): vec3 {
    const alignment = vec3.create()
    for (const neighbor of neighbors) {
      vec3.add(alignment, alignment, neighbor.velocity)
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
      const cohesionDir = vec3.subtract(vec3.create(), neighbor.position, this.position)
      vec3.add(cohesion, cohesion, cohesionDir)
    }
    vec3.normalize(cohesion, cohesion)
    vec3.scale(cohesion, cohesion, this.config.acceleration.cohesion)
    return cohesion
  }

  /**
   * Get a random position in the flight zone.
   */
  private separationAcceleration(closeNeighbors: Boid[], cellRadius: number): vec3 {
    const separation = vec3.create()
    for (const neighbor of closeNeighbors) {
      const separationDir = vec3.subtract(vec3.create(), this.position, neighbor.position)
      const dist = vec3.length(separationDir)
      if (dist === 0) continue // Skip superposed neighbors

      vec3.scale(separationDir, separationDir, cellRadius / dist)
      vec3.add(separation, separation, separationDir)
    }

    vec3.normalize(separation, separation)
    vec3.scale(separation, separation, this.config.acceleration.separation)
    return separation
  }
}
