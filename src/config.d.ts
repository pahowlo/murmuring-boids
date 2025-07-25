export interface BoidConfig {
  size: number
  minSpeed: number
  maxSpeed: number
  maxTurnAngleDeg: number
  acceleration: {
    meetObjective: number
    gravity: number
  }
}

export interface RendererConfig {
  backgroundColor: string
  debug: {
    flightZoneColor: string
  }
}
