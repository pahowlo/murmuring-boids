import { vec3 } from "gl-matrix"

import type { BoidConfig } from "./config"
import { limitTurn } from "./utilities/constraints"
import { isInPolygon } from "./utilities/rayCasting2D"

export const defaultBoidConfig: BoidConfig = {
  minSpeed: 1,
  maxSpeed: 6,
  maxTurnAngleDeg: 120,
  acceleration: {
    meetObjective: 1.5,
    // cohesion: 0.1,
    // alignment: 0.1,
    // separation: 0.1,
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

  private objective?: {
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
    this.velocity = vec3.fromValues(Math.cos(theta) * this.config.maxSpeed, Math.sin(theta) * this.config.maxSpeed, 0)
    this.acceleration = vec3.create()
  }

  getPosition(): vec3 {
    return vec3.clone(this.position)
  }

  getVelocity(): vec3 {
    return vec3.clone(this.velocity)
  }

  update(neighbors: Boid[], closeNeighbors: Boid[], polygon: vec3[], centroids: vec3[]): void {
    // Init self acceleration. Basically where little birdie wants to go
    const selfAcceleration = vec3.create()

    // If no objective is set, perform boundary check
    if (!this.objective && !isInPolygon(this.position, polygon)) {
      let turnBackDirection = vec3.create()
      let maxDist = 0
      for (const point of centroids) {
        const diff = vec3.subtract(vec3.create(), point, this.position)
        const dist = Math.abs(diff[0]) + Math.abs(diff[1])
        if (dist > maxDist) {
          maxDist = dist
          turnBackDirection = diff
        }
      }
      turnBackDirection[2] = 0 // Keep it 2D
      vec3.normalize(turnBackDirection, turnBackDirection)
      this.objective = {
        direction: turnBackDirection,
        remainingTicks: 30,
      }
    }

    if (this.objective) {
      this.objective.remainingTicks -= 1
      if (this.objective.remainingTicks <= 0) {
        this.objective = undefined
      } else {
        // Move towards objective}
        const steering = vec3.copy(vec3.create(), this.objective.direction)
        vec3.normalize(steering, steering)
        vec3.scale(steering, steering, this.config.acceleration.meetObjective)

        vec3.add(selfAcceleration, selfAcceleration, steering)
      }
    }

    // // Cohesion and alignment
    // for (const neighbor of neighbors) {
    //   // Cohesion: Move towards the average position of neighbors
    //   const diff = vec3.subtract(vec3.create(), this.position, neighbor.getPosition())
    //   diff[2] = 0 // Keep it 2D
    //   const dist = vec3.length(diff)
    //   if (dist == 0) {
    //     continue
    //   }
    //   vec3.scale(diff, diff, this.config.acceleration.separation)
    //   vec3.add(this.acceleration, this.acceleration, diff)

    //   // Alignment: Move towards the average velocity of neighbors
    //   vec3.add(this.acceleration, this.acceleration, neighbor.getVelocity())
    //   vec3.scale(this.acceleration, this.acceleration, this.config.acceleration.alignment)
    //   vec3.add(this.acceleration, this.acceleration, this.velocity)
    // }

    // Reset acceleration with truncated self acceleration
    limitTurn(this.acceleration, this.velocity, selfAcceleration, this.config.maxTurnAngleDeg)

    this.acceleration[1] += this.config.acceleration.gravity // Apply gravity
    this.acceleration[2] = 0 // Keep it 2D

    // Update velocity
    vec3.add(this.velocity, this.velocity, this.acceleration)

    if (vec3.length(this.velocity) > this.config.maxSpeed) {
      // Normalize to max speed if too fast
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, this.config.maxSpeed)
    } else if (vec3.length(this.velocity) < this.config.minSpeed) {
      // Normalize to min speed if too slow
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, this.config.minSpeed)
    }

    // Update position
    this.position = vec3.add(this.position, this.position, this.velocity)
  }
}
