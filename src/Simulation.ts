import { vec3 } from "gl-matrix"

import type { BoidConfig } from "./config"
import { Boid } from "./Boid"
import { FlightZone, Box } from "./FlightZone"

// Main class
export class Simulation {
  private simBox: Box
  private maxDepth: number

  maxBoidCount: number = 0
  boidConfig: Partial<BoidConfig> = {}
  boids: Boid[] = []

  private isRunning: boolean = false

  constructor(simBox: Box, maxDepth: number) {
    this.simBox = simBox
    this.maxDepth = maxDepth
  }

  resize(newSimBox: Box, maxDepth?: number): void {
    this.simBox = newSimBox
    if (maxDepth) {
      this.maxDepth = maxDepth
    }
  }

  start(boidCount: number, boidConfig: Partial<BoidConfig>): void {
    this.maxBoidCount = boidCount
    this.boidConfig = boidConfig

    for (let i = 0; i < this.maxBoidCount; i++) {
      const position = vec3.fromValues(
        this.simBox.start.x + this.simBox.width * (Math.random() * 1.4 - 0.2),
        this.simBox.start.y + this.simBox.height * (Math.random() * 1.4 - 0.2),
        Math.random() * this.maxDepth,
      )
      this.boids.push(new Boid(position))
    }
    this.isRunning = true
  }

  update(flightZone: FlightZone): void {
    if (!this.isRunning) return

    this.boids.forEach((boid) => {
      boid.update(this.boids, flightZone.polygon, flightZone.centroids)
    })
  }

  stop(): void {
    this.isRunning = false
    this.boids = []
    this.maxBoidCount = 0
  }
}
