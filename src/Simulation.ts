import { vec3 } from "gl-matrix"

import type { BoidConfig, SimulationConfig } from "./config"
import { IncrementalSpatialGrid } from "./utilities/spatialGrid"
import { Boid } from "./Boid"
import { FlightZone, Box } from "./FlightZone"

export const defaultSimulationConfig: SimulationConfig = {
  maxDepth: 250,
  visibleRange: 500,
  grid: {
    cellSize: { x: 10, y: 10 },
    neighborDistance: { min: 1, max: 5, limitCount: 30 },
    closeNeighborDistance: {
      min: 0,
      max: 0,
      limitCount: 20,
    },
  },
}

// Main class
export class Simulation {
  private simBox: Box
  private config: SimulationConfig

  maxBoidCount: number = 0
  boidConfig: Partial<BoidConfig> = {}
  boids: Boid[] = []

  private spatialGrid: IncrementalSpatialGrid<Boid>
  private isRunning: boolean = false

  private nextDisplayId: number = 0

  constructor(simBox: Box, simulationConfig: Partial<SimulationConfig> = {}) {
    this.simBox = simBox

    this.config = {
      ...defaultSimulationConfig,
      ...simulationConfig,
    }
    this.spatialGrid = new IncrementalSpatialGrid<Boid>(this.config.grid.cellSize)
  }

  getConfig(): Readonly<SimulationConfig> {
    return this.config
  }

  resize(newSimBox: Box, maxDepth?: number): void {
    this.simBox = newSimBox
    if (maxDepth) {
      this.config.maxDepth = maxDepth
    }
  }

  start(startBoidCount: number, boidConfig: Partial<BoidConfig>): void {
    if (startBoidCount > this.maxBoidCount) {
      this.maxBoidCount = startBoidCount
    }
    this.boidConfig = boidConfig

    for (let _ = 0; _ < startBoidCount; _++) {
      this.spawnBoid(Math.random() * this.config.maxDepth)
    }
    this.isRunning = true
  }

  boidCount(): number {
    return this.boids.length
  }

  addBoidsIfMissing(count: number): boolean {
    const missingCount = this.maxBoidCount - this.boids.length
    if (missingCount > 0) {
      for (let _ = 0; _ < Math.min(count, missingCount); _++) {
        this.spawnBoid(this.config.maxDepth)
      }
      return true // Boids were added
    }
    return false // No boids were added
  }

  removeBoids(count: number): void {
    if (this.boids.length <= count) {
      this.boids = []
      this.spatialGrid.clear()
      return // All boids were removed
    }

    for (let _ = 0; _ < count; _++) {
      const boid = this.boids.pop()
      if (boid) {
        this.spatialGrid.remove(boid)
      }
    }
  }

  update(flightZone: FlightZone, maxHeight: number): void {
    if (!this.isRunning) return

    for (const boid of this.boids) {
      const neighbors = this.spatialGrid.getNeighbors(boid, this.config.grid.neighborDistance)
      const closeNeighbors = this.spatialGrid.getNeighbors(
        boid,
        this.config.grid.closeNeighborDistance,
      )

      boid.update(
        neighbors,
        closeNeighbors,
        this.spatialGrid.cellRadius,
        flightZone,
        maxHeight,
        this.config.visibleRange,
      )
      this.spatialGrid.update(boid)
    }
  }

  private spawnBoid(depth: number): void {
    const position = vec3.fromValues(
      this.simBox.start.x + this.simBox.width * (Math.random() * 1.4 - 0.2),
      this.simBox.start.y + this.simBox.height * (Math.random() * 1.2 - 0.2) - 20,
      // Spawn new boid at max depth to make it slowly appear from the background
      depth,
    )
    const boid = new Boid(this.nextDisplayId, position, this.boidConfig)
    this.nextDisplayId++

    this.boids.push(boid)
    this.spatialGrid.update(boid)
  }

  stop(): void {
    this.isRunning = false
    this.boids = []
    this.maxBoidCount = 0
  }
}
