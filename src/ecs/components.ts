import type { BoidConfig } from "../config"
import { Archetype } from "./World"

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

// == Components: name -> stride (Float32 values; integers exact up to 2^24)
export const Transform = {
  position: 3,
  velocity: 3,
}

export const BoidState = {
  displayId: 1,
  acceleration: 3,
  isOutside: 1, // 0 | 1
  // lastPositionInside is undefined if hasLastPositionInside == 0
  lastPositionInside: 3,
  hasLastPositionInside: 1, // 0 | 1
  // backToFlightZone is undefined if backToFlightZoneTicks <= 0
  backToFlightZoneDirection: 3,
  backToFlightZoneTicks: 1,
  // followCentroids is undefined if followCentroidsTicks <= 0
  followCentroidsDirection: 3,
  followCentroidsTicks: 1,
}

type TransformKey = keyof typeof Transform
type BoidKey = TransformKey | keyof typeof BoidState

// == Archetypes
export type BoidArchetype = Archetype<BoidKey>
export function createBoidArchetype(): BoidArchetype {
  return new Archetype({ ...Transform, ...BoidState })
}

/** Boids removed from the simulation on stop, but still referenced by the spatial grid. */
export type DetachedArchetype = Archetype<TransformKey>
export function createDetachedArchetype(): DetachedArchetype {
  return new Archetype(Transform)
}
