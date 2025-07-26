import { vec3 } from "gl-matrix"

import { limitTurn } from "./utilities/constraints"
import { isInPolygon } from "./utilities/rayCasting2D"
import { BoidConfig } from "./config"

export const defaultBoidConfig: BoidConfig = {
  size: 5,
  minSpeed: 1,
  maxSpeed: 6,
  maxTurnAngleDeg: 120,
  acceleration: { meetObjective: 1.5, gravity: 0.05 },
}

// Main class
export class Boid {
  private position: vec3
  private velocity: vec3
  private acceleration: vec3

  private config: BoidConfig

  private objective?: {
    direction: vec3
    remainingTicks: number
  }

  constructor(position: vec3, boidConfig: Partial<BoidConfig> = {}) {
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
    return this.position
  }

  getVelocity(): vec3 {
    return this.velocity
  }

  getSize(): number {
    return this.config.size
  }

  update(neighbors: Boid[], polygon: vec3[], centroids: vec3[]): void {
    // Reset acceleration
    this.acceleration = vec3.fromValues(0, this.config.acceleration.gravity, 0)

    // Simple boundary check
    if (!isInPolygon(this.position, polygon) && !this.objective) {
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
      const steering = limitTurn(this.velocity, this.objective.direction, this.config.maxTurnAngleDeg)
      vec3.normalize(steering, steering)
      vec3.scale(steering, steering, this.config.acceleration.meetObjective)

      vec3.add(this.acceleration, this.acceleration, steering)

      this.objective.remainingTicks -= 1
      if (this.objective.remainingTicks <= 0) {
        this.objective = undefined
      }
    }

    // Update velocity
    vec3.add(this.velocity, this.velocity, this.acceleration)

    if (vec3.length(this.velocity) > this.config.maxSpeed) {
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, this.config.maxSpeed)
    } else if (vec3.length(this.velocity) < this.config.minSpeed) {
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, this.config.minSpeed)
    }

    // Update position
    this.position = vec3.add(this.position, this.position, this.velocity)
  }
}
