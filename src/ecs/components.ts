import type { BoidConfig } from "../config"
import { Archetype, type ColumnSpec } from "./World"

export const defaultBoidConfig: BoidConfig = {
  minSpeed: 1,
  maxSpeed: 4,
  maxTurnAngleDeg: 140,
  acceleration: {
    backToFlightZone: 0.6,
    stayCloseToCenterOwfMass: 0.1,
    followCentroids: -2,
    pullUpTerrain: 1.8,
    cohesion: 0.4,
    alignment: 1,
    separation: 1.8,
  },
}

const vec3Column: ColumnSpec<Float32Array> = { type: Float32Array, stride: 3 }
const int32: ColumnSpec<Int32Array> = { type: Int32Array, stride: 1 }
const flag: ColumnSpec<Uint8Array> = { type: Uint8Array, stride: 1 }

// == Components
export const Transform = {
  position: vec3Column,
  velocity: vec3Column,
}

export const BoidState = {
  displayId: int32,
  acceleration: vec3Column,
  isOutside: flag,
  // lastPositionInside is undefined if hasLastPositionInside == 0
  lastPositionInside: vec3Column,
  hasLastPositionInside: flag,
  // backToFlightZone is undefined if backToFlightZoneTicks <= 0
  backToFlightZoneDirection: vec3Column,
  backToFlightZoneTicks: int32,
  // followCentroids is undefined if followCentroidsTicks <= 0
  followCentroidsDirection: vec3Column,
  followCentroidsTicks: int32,
}

export type BoidObjects = { config: BoidConfig }

// == Archetypes
export function createBoidArchetype() {
  return new Archetype<typeof Transform & typeof BoidState, BoidObjects>(
    { ...Transform, ...BoidState },
    ["config"],
  )
}
export type BoidArchetype = ReturnType<typeof createBoidArchetype>

/** Boids removed from the simulation on stop, but still referenced by the spatial grid. */
export function createDetachedArchetype() {
  return new Archetype<typeof Transform, object>(Transform)
}
export type DetachedArchetype = ReturnType<typeof createDetachedArchetype>
