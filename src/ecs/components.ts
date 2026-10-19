import type { BoidConfig } from "../config"
import { Archetype } from "./World"

export const defaultBoidConfig: BoidConfig = {
  minSpeed: 2,
  maxSpeed: 4,
  maxTurnAngleDeg: 70,
  acceleration: {
    backToFlightZone: 0.15,
    stayCloseToCenterOwfMass: 0.05,
    followCentroids: 0.15,
    pullUpTerrain: 1,
    cohesion: 0.2,
    alignment: 0.4,
    separation: 1,
  },
}

// == Components: name -> stride (Float32 values; integers exact up to 2^24)
export const Transform = {
  position: 3,
  velocity: 3,
}

export const BoidState = {
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
