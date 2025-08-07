export interface BoidConfig {
  minSpeed: number
  maxSpeed: number
  maxTurnAngleDeg: number
  acceleration: {
    backToFlightZone: number
    followCentroids: number
    pullUpTerrain: number
    cohesion: number
    alignment: number
    separation: number
    gravity: number
  }
}

export interface RendererConfig {
  clearCanvasIfResized: boolean
  boids: {
    lineWidth: number
    size: number
  }
  debug: {
    flightZone: { polygonColor: string; centroidsColor: string }
  }
}

interface gridDistance {
  min: number
  max: number
  // How many items to consider at most whithin the distance
  limitCount: number
}

export interface SimulationConfig {
  maxDepth: number
  visibleRange: number
  grid: {
    cellSize: { x: number; y: number }
    neighborDistance: gridDistance
    closeNeighborDistance: gridDistance
  }
}
