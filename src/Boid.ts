import { vec3 } from "gl-matrix"

import type { BoidConfig } from "./config"
import { limitTurn } from "./utilities/constraints"

export const defaultBoidConfig: BoidConfig = {
  minSpeed: 1,
  maxSpeed: 6,
  maxTurnAngleDeg: 120,
  acceleration: {
    backToFlightZone: 0.6,
    pullUpTerrain: 1,
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

  getPosition(): vec3 {
    return vec3.clone(this.position)
  }

  getVelocity(): vec3 {
    return vec3.clone(this.velocity)
  }

  update(
    neighbors: Boid[],
    closeNeighbors: Boid[],
    cellSize: vec3,
    IsOutsideFlightZone: (pos: vec3) => boolean,
    polygon: vec3[],
    centroids: vec3[],
    maxHeight: number,
  ): void {
    let maxTurnAngleDeg = this.config.maxTurnAngleDeg
    let maxSpeed = this.config.maxSpeed
    let pullUpTerrain = false

    const selfAcceleration = vec3.create()

    // Pull up if low terrain
    if (this.position[1] >= maxHeight) {
      selfAcceleration[1] = -this.config.acceleration.pullUpTerrain
      // Allow more freedom to pull up
      maxTurnAngleDeg += 20
      maxSpeed += 1
      pullUpTerrain = true
    }

    // Boundary check: Get back to flight zone if outside
    if (!this.backToFlightZone && IsOutsideFlightZone(this.position)) {
      const turnBackDirection = vec3.create()
      for (const point of centroids.length > 0 ? centroids : polygon) {
        vec3.add(
          turnBackDirection,
          turnBackDirection,
          vec3.subtract(vec3.create(), point, this.position),
        )
      }
      vec3.normalize(turnBackDirection, turnBackDirection)
      this.backToFlightZone = {
        direction: turnBackDirection,
        remainingTicks: 20,
      }
    }

    if (this.backToFlightZone && this.backToFlightZone.remainingTicks > 0) {
      // Get back to flight zone
      const steering = vec3.copy(vec3.create(), this.backToFlightZone.direction)
      vec3.normalize(steering, steering)
      vec3.scale(steering, steering, this.config.acceleration.backToFlightZone)

      vec3.add(selfAcceleration, selfAcceleration, steering)
      this.backToFlightZone.remainingTicks -= 1

      if (this.backToFlightZone.remainingTicks <= 0) {
        this.backToFlightZone = undefined
      }
    }

    // Cohesion and alignment: Stay with the flock
    if (!pullUpTerrain) {
      const alignment = vec3.create()
      const cohesion = vec3.create()
      for (const neighbor of neighbors) {
        // Cohesion: Move towards the average position of neighbors
        const cohesionDir = vec3.subtract(vec3.create(), neighbor.getPosition(), this.position)
        vec3.add(cohesion, cohesion, cohesionDir)

        const alignmentDir = neighbor.getVelocity()
        vec3.add(alignment, alignment, alignmentDir)
      }
      vec3.normalize(cohesion, cohesion)
      vec3.scale(cohesion, cohesion, this.config.acceleration.cohesion)
      vec3.normalize(alignment, alignment)
      vec3.scale(alignment, alignment, this.config.acceleration.alignment)

      vec3.add(selfAcceleration, selfAcceleration, cohesion)
      vec3.add(selfAcceleration, selfAcceleration, alignment)
    }

    // Separation: Avoid collisions with neighbors
    const separation = vec3.create()
    const cellRadius = Math.max(cellSize[0], cellSize[1], cellSize[2])
    for (const neighbor of closeNeighbors) {
      const separationDir = vec3.subtract(vec3.create(), this.position, neighbor.getPosition())
      const dist = vec3.length(separationDir)
      if (dist === 0) continue // Skip superposed neighbors

      vec3.scale(separationDir, separationDir, cellRadius / dist)
      vec3.add(separation, separation, separationDir)
    }

    vec3.normalize(separation, separation)
    vec3.scale(separation, separation, this.config.acceleration.separation)
    vec3.add(selfAcceleration, selfAcceleration, separation)

    // Reset acceleration with truncated self acceleration
    limitTurn(this.acceleration, this.velocity, selfAcceleration, maxTurnAngleDeg)

    this.acceleration[1] += this.config.acceleration.gravity // Apply gravity

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
}
