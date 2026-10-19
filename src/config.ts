export interface BoidConfig {
  minSpeed: number
  maxSpeed: number
  maxTurnAngleDeg: number
  acceleration: {
    backToFlightZone: number
    stayCloseToCenterOwfMass: number
    followCentroids: number
    pullUpTerrain: number
    cohesion: number
    alignment: number
    separation: number
  }
}

export function updateBoidConfig(config: BoidConfig, update: Partial<BoidConfig>): BoidConfig {
  return {
    ...config,
    ...update,
    acceleration: { ...config.acceleration, ...update.acceleration },
  }
}

export interface RendererConfig {
  clearCanvasIfResized: boolean
  boids: {
    lineWidth: number
    sizeScreenHeightRatio: number
  }
  flightZone: { polygonColor: string }
  debug: {
    flightZone: { polygonColor: string; centroidsColor: string }
    centerOwMassColor: string
    maxHeightColor: string
  }
}

interface gridDistance {
  min: number
  max: number
  // How many items to consider at most whithin the distance
  limitCount: number
}

export interface SimulationConfig {
  gravity: number
  maxDepth: number
  visibleDistance: number
  grid: {
    cellSize: { x: number; y: number; z: number }
    neighborDistance: gridDistance
    closeNeighborDistance: gridDistance
  }
}
