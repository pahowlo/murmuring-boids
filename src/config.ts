export interface BoidConfig {
  minSpeed: number
  maxSpeed: number
  maxTurnAngleDeg: number
  acceleration: {
    backToFlightZone: number
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
    flightZoneColor: string
  }
}

export interface SimulationConfig {
  maxDepth: number
  grid: {
    neighborDistance: number
    closeNeighborDistance: number
    maxNeighborCount: number
    cellSize: { x: number; y: number }
  }
}
