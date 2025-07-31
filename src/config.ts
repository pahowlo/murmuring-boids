export interface BoidConfig {
  minSpeed: number
  maxSpeed: number
  maxTurnAngleDeg: number
  acceleration: {
    meetObjective: number
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
  grid: {
    neighborDistance: number
    closeNeighborDistance: number
    maxNeighborCount: number
    cellSize: { x: number; y: number }
  }
}
