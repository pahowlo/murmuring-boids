import { vec3 } from "gl-matrix"
import { BoidConfig, BoidState, RenderContext } from "./types"

export class Boid {
  private state: BoidState
  private config: BoidConfig

  constructor(position: vec3, config: BoidConfig) {
    this.config = config

    const theta = Math.random() * 2 * Math.PI
    this.state = {
      position: position,
      velocity: vec3.fromValues(Math.cos(theta) * this.config.maxSpeed, Math.sin(theta) * this.config.maxSpeed, 0),
      acceleration: vec3.create(),
    }

  }

  get position(): vec3 {
    return vec3.clone(this.state.position)
  }

  get velocity(): vec3 {
    return vec3.clone(this.state.velocity)
  }

  update(neighbors: Boid[]): void {
    this.state.position = vec3.add(this.state.position, this.state.position, this.state.velocity)
  }

  render(context: RenderContext): void {
    const { ctx, canvas } = context

    ctx.fillStyle = "#ff0000"

    ctx.save()
    ctx.translate(this.position[0], this.position[1])

    if (vec3.length(this.velocity) > 0) {
      const angle = Math.atan2(this.velocity[1], this.velocity[0])
      ctx.rotate(angle)
    }

    this.drawBoid(ctx, 10)
    ctx.restore()
  }

  private drawBoid(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath()
    ctx.moveTo(size, 0)
    ctx.lineTo(-size * 0.5, size * 0.5)
    ctx.lineTo(-size * 0.3, 0)
    ctx.lineTo(-size * 0.5, -size * 0.5)
    ctx.closePath()
    ctx.fill()
  }
}
