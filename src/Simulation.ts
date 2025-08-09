import { vec3 } from "gl-matrix"

import type { BoidConfig, SimulationConfig } from "./config"
import { IncrementalSpatialGrid } from "./utilities/spatialGrid"
import { Boid } from "./Boid"
import { FlightZone, Box } from "./FlightZone"

export const defaultSimulationConfig: SimulationConfig = {
  gravity: 0.05,
  maxDepth: 250,
  visibleDistance: 500,
  visibleDepth: 50,
  grid: {
    cellSize: { x: 10, y: 10 },
    neighborDistance: { min: 1, max: 6, limitCount: 30 },
    closeNeighborDistance: {
      min: 0,
      max: 0,
      limitCount: 10,
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
  private randomSeed: { value: number; remainingTicks: number } = { value: 1, remainingTicks: 0 }
  private isRunning: boolean = false

  private nextDisplayId: number = 0

  constructor(simBox: Box, simulationConfig: Partial<SimulationConfig> = {}) {
    this.simBox = simBox

    this.config = {
      ...defaultSimulationConfig,
      ...simulationConfig,
    }
    this.spatialGrid = new IncrementalSpatialGrid<Boid>(
      this.config.grid.cellSize,
      this.maxBoidCount,
    )
  }

  refreshRandomSeed(): void {
    this.randomSeed.remainingTicks--
    if (this.randomSeed.remainingTicks > 0) return

    this.randomSeed.value = Math.random()
    this.randomSeed.remainingTicks = Math.floor(Math.random() * 121)
  }

  getConfig(): Readonly<SimulationConfig> {
    return this.config
  }
  getCenterOwMass(): Readonly<vec3> {
    return this.spatialGrid.centerOwMass
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
        this.spawnBoid(this.config.maxDepth, true)
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

    this.spatialGrid.maxItemCount = this.maxBoidCount // Just in case it changed
    this.refreshRandomSeed()

    const gravityAxis = this.randomSeed.value < 0.5 ? 0 : 1
    const gravitySign = this.randomSeed.value % 0.5 < 0.25 ? -1 : 1
    const gravity = vec3.create()
    gravity[gravityAxis] = gravitySign * this.config.gravity

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
        this.spatialGrid.centerOwMass,
        flightZone,
        maxHeight,
        this.config.visibleDistance,
        this.config.visibleDepth,
        this.randomSeed.value,
        gravity,
      )
      this.spatialGrid.update(boid)
    }
  }

  private spawnBoid(depth: number, withinFlock?: boolean): void {
    let cellCoords
    if (withinFlock) {
      cellCoords = this.spatialGrid.getRandomCellCoords()
    }
    const { startX, startY, width, height } = cellCoords || {
      startX: this.simBox.start.x - 100,
      startY: this.simBox.start.y - 20,
      width: this.simBox.width + 100,
      height: this.simBox.height,
    }
    const position = vec3.fromValues(
      startX + width * (Math.random() * 1.2 - 0.1),
      startY + height * (Math.random() * 1.2 - 0.1),
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
