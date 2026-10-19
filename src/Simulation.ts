import { vec3 } from "gl-matrix"

import { type BoidConfig, type SimulationConfig, updateBoidConfig } from "./config"
import { type BoidArchetype, createBoidArchetype, defaultBoidConfig } from "./ecs/components"
import { type TransformReader, updateBoid } from "./ecs/systems/boidSystem"
import { type Entity, World } from "./ecs/World"
import type { Box, FlightZone } from "./FlightZone"
import { type CellCoords, IncrementalSpatialGrid } from "./utilities/spatialGrid"

export const defaultSimulationConfig: SimulationConfig = {
  gravity: 0.05,
  maxDepth: 500,
  visibleDistance: 500,
  grid: {
    cellSize: { x: 20, y: 20, z: 20 },
    neighborDistance: { min: 1, max: 5, limitCount: 7 },
    closeNeighborDistance: {
      min: 0,
      max: 0,
      limitCount: 1,
    },
  },
}

// Main class
export class Simulation {
  private simBox: Box
  private config: SimulationConfig

  maxBoidCount: number = 0
  boidConfig: Partial<BoidConfig> = {}
  private world: World = new World()
  readonly boids: BoidArchetype = createBoidArchetype()
  private transforms: TransformReader

  private spatialGrid: IncrementalSpatialGrid<Entity>
  private randomSeed: { value: number; remainingTicks: number } = { value: 1, remainingTicks: 0 }
  private isRunning: boolean = false

  constructor(simBox: Box, simulationConfig: Partial<SimulationConfig> = {}) {
    this.simBox = simBox

    this.config = {
      ...defaultSimulationConfig,
      ...simulationConfig,
    }
    const world = this.world
    this.transforms = {
      position(entity: Entity): Readonly<vec3> {
        const { archetype, row } = world.locate(entity)
        return archetype.views.position[row]
      },
      velocity(entity: Entity): Readonly<vec3> {
        const { archetype, row } = world.locate(entity)
        return archetype.views.velocity[row]
      },
    }
    this.spatialGrid = new IncrementalSpatialGrid<Entity>(this.config.grid.cellSize, this.maxBoidCount, this.transforms)
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
    return this.boids.count
  }

  addBoidsIfMissing(count: number): boolean {
    const missingCount = this.maxBoidCount - this.boids.count
    if (missingCount > 0) {
      for (let _ = 0; _ < Math.min(count, missingCount); _++) {
        this.spawnBoid(this.config.maxDepth, true)
      }
      return true // Boids were added
    }
    return false // No boids were added
  }

  removeBoids(count: number): void {
    if (this.boids.count <= count) {
      this.despawnAll()
      return // All boids were removed
    }

    for (let _ = 0; _ < count; _++) {
      const boid = this.boids.entities[this.boids.count - 1]
      this.spatialGrid.remove(boid)
      this.world.despawn(boid)
    }
  }

  update(flightZone: FlightZone, maxHeight: number): void {
    if (!this.isRunning) return

    this.spatialGrid.setMaxItemCount(this.maxBoidCount)
    this.refreshRandomSeed()

    const gravityAxis = this.randomSeed.value < 0.5 ? 0 : 1
    const gravitySign = this.randomSeed.value % 0.5 < 0.25 ? -1 : 1
    const gravity = vec3.create()
    gravity[gravityAxis] = gravitySign * this.config.gravity

    const ctx = {
      config: updateBoidConfig(defaultBoidConfig, this.boidConfig),
      closeRadius: this.spatialGrid.cellRadius,
      centerOwMass: this.spatialGrid.centerOwMass,
      flightZone,
      maxHeight,
      visibleDistance: this.config.visibleDistance,
      randomSeed: this.randomSeed.value,
      gravity,
    }

    const boids = this.boids
    for (let row = 0; row < boids.count; row++) {
      const boid = boids.entities[row]
      const neighbors = this.spatialGrid.getNeighbors(boid, this.config.grid.neighborDistance)
      const closeNeighbors = this.spatialGrid.getNeighbors(boid, this.config.grid.closeNeighborDistance)

      updateBoid(boids, row, neighbors, closeNeighbors, this.transforms, ctx)
      this.spatialGrid.update(boid)
    }
  }

  private spawnBoid(depth: number, withinFlock?: boolean): void {
    let cellCoords: CellCoords | undefined
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
    const config = updateBoidConfig(defaultBoidConfig, this.boidConfig)
    const boid = this.world.spawn(this.boids)
    const row = this.boids.count - 1
    const v = this.boids.views

    const theta = Math.random() * 2 * Math.PI
    vec3.copy(v.position[row], position)
    const velocity = vec3.set(v.velocity[row], Math.cos(theta) * 0.5, Math.sin(theta) * 0.5, Math.random() - 0.5)
    vec3.scale(velocity, velocity, config.maxSpeed)

    this.spatialGrid.update(boid)
  }

  stop(): void {
    this.isRunning = false
    this.despawnAll()
    this.maxBoidCount = 0
  }

  private despawnAll(): void {
    while (this.boids.count > 0) {
      this.world.despawn(this.boids.entities[this.boids.count - 1])
    }
    this.spatialGrid.clear()
  }
}
