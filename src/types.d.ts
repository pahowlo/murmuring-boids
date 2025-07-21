import { vec3 } from "gl-matrix"

export interface BoidConfig {
  maxSpeed: number
  acceleration: {
    turnBack: number
    gravity: number
  }
}

export interface PercentPoint {
  x: number
  y: number
}

export interface CanvasConfig {
  topLeft: PercentPoint
  bottomRight: PercentPoint
}

export interface RenderOptions {
  canvasDepth: number
  backgroundColor: string
  boidSize: number
}

export interface RenderContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  options: RenderOptions
}
