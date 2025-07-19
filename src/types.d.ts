import { vec3 } from "gl-matrix"

export interface BoidConfig {
  maxSpeed: number
}

export interface BoidState {
  position: vec3
  velocity: vec3
  acceleration: vec3
}

export interface PercentPoint {
  x: number
  y: number
}

export interface CanvasConfig {
  topLeft: PercentPoint
  bottomRight: PercentPoint
}

export interface RenderContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}
