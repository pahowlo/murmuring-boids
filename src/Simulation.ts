import { vec3 } from "gl-matrix"

import type { BoidConfig, SimulationConfig } from "./config"
import { IncrementalSpatialGrid } from "./utilities/spatialGrid"
import { Boid } from "./Boid"
import { FlightZone, Box } from "./FlightZone"

export const defaultSimulationConfig: SimulationConfig = {
  grid: {
    neighborDistance: 2,
    closeNeighborDistance: 0,
    maxNeighborCount: 20,
    cellSize: { x: 10, y: 10 },
  },
}

// Main class
export class Simulation {
  private simBox: Box
  private maxDepth: number
  private config: SimulationConfig

  maxBoidCount: number = 0
  boidConfig: Partial<BoidConfig> = {}
  boids: Boid[] = []

  private spatialGrid: IncrementalSpatialGrid<Boid>
  private isRunning: boolean = false

  private nextDisplayId: number = 0

  constructor(simBox: Box, maxDepth: number, simulationConfig: Partial<SimulationConfig> = {}) {
    this.simBox = simBox
    this.maxDepth = maxDepth

    this.config = {
      ...defaultSimulationConfig,
      ...simulationConfig,
    }
    this.spatialGrid = new IncrementalSpatialGrid<Boid>(this.config.grid.cellSize)
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

    for (let _ = 0; _ < this.maxBoidCount; _++) {
      const position = vec3.fromValues(
        this.simBox.start.x + this.simBox.width * (Math.random() * 1.4 - 0.2),
        this.simBox.start.y + this.simBox.height * (Math.random() * 1.4 - 0.2),
        Math.random() * this.maxDepth,
      )
      const boid = new Boid(this.nextDisplayId, position, this.boidConfig)
      this.nextDisplayId++

      this.boids.push(boid)
      this.spatialGrid.update(boid)
    }
    this.isRunning = true
  }

  update(flightZone: FlightZone): void {
    if (!this.isRunning) return

    for (const boid of this.boids) {
      const neighbors = this.spatialGrid.getNeighbors(
        boid,
        this.config.grid.neighborDistance,
        this.config.grid.maxNeighborCount,
      )
      const closeNeighbors = this.spatialGrid.getNeighbors(
        boid,
        this.config.grid.closeNeighborDistance,
        this.config.grid.maxNeighborCount,
      )

      boid.update(
        neighbors,
        closeNeighbors,
        this.spatialGrid.cellSize,
        flightZone.polygon,
        flightZone.centroids,
      )
      this.spatialGrid.update(boid)
    }
  }

  stop(): void {
    this.isRunning = false
    this.boids = []
    this.maxBoidCount = 0
  }
}
