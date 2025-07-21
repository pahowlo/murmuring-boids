import { vec3, vec2 } from "gl-matrix"

import { limitTurn } from "./utilities/constraints"
import { isInPolygon } from "./utilities/rayCasting2D"
import { BoidConfig, RenderContext } from "./types"
import { defaultBoidConfig } from "./config"

export class Boid {
  private position: vec3
  private velocity: vec3
  private acceleration: vec3

  private config: BoidConfig
  private desiredDirection: vec3 | null = null

  constructor(position: vec3, boidConfig: Partial<BoidConfig> = {}) {
    this.config = {
      ...boidConfig,
      ...defaultBoidConfig,
    }

    const theta = Math.random() * 2 * Math.PI
    this.position = position
    this.velocity = vec3.fromValues(Math.cos(theta) * this.config.maxSpeed, Math.sin(theta) * this.config.maxSpeed, 0)
    this.acceleration = vec3.create()
  }

  update(neighbors: Boid[], flightZone: vec2[], flightZoneCenter: vec3): void {
    // Reset acceleration
    this.acceleration = vec3.fromValues(0, this.config.acceleration.gravity, 0)

    // Simple boundary check
    if (isInPolygon(this.position, flightZone)) {
      this.desiredDirection = null
    } else {
      this.desiredDirection = vec3.subtract(vec3.create(), flightZoneCenter, this.position)
      vec3.normalize(this.desiredDirection, this.desiredDirection)
    }

    if (this.desiredDirection) {
      const steering = limitTurn(this.velocity, this.desiredDirection, 180)
      vec3.normalize(steering, steering)
      vec3.scale(steering, steering, this.config.acceleration.turnBack)

      vec3.add(this.acceleration, this.acceleration, steering)
    }

    // Update velocity
    vec3.add(this.velocity, this.velocity, this.acceleration)
    if (vec3.length(this.velocity) > this.config.maxSpeed) {
      vec3.normalize(this.velocity, this.velocity)
      vec3.scale(this.velocity, this.velocity, this.config.maxSpeed + 1)
    }
    // Update position
    this.position = vec3.add(this.position, this.position, this.velocity)
  }

  render(context: RenderContext): void {
    const { ctx, canvas } = context

    const [x, y, z] = this.position
    const opacity = 100 - (z / context.options.canvasDepth) ** 2 * 60

    ctx.strokeStyle = `hsl(0, 0%, ${opacity}%)`

    ctx.save()
    ctx.translate(x, y)

    if (vec3.length(this.velocity) > 0) {
      const angle = Math.atan2(this.velocity[1], this.velocity[0])
      ctx.rotate(angle)
    }

    this.drawBoid(ctx, context.options.boidSize)
    ctx.restore()
  }

  private drawBoid(ctx: CanvasRenderingContext2D, size: number): void {
    // Draw triangle
    ctx.beginPath()
    ctx.moveTo(size, 0) // Nose
    ctx.lineTo(-size * 0.5, size * 0.3) // Right wing
    ctx.lineTo(-size * 0.5, -size * 0.3) // Left wing
    ctx.closePath()
    ctx.stroke()

    // Draw center line (fold)
    ctx.beginPath()
    ctx.moveTo(size, 0) // Nose
    ctx.lineTo(-size * 0.5, 0) // Tail center
    ctx.stroke()
  }
}
