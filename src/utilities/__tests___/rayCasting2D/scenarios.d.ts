export interface ScenarioPoint {
  coord: [number, number]
  isInPolygon: boolean
}

export interface Scenario {
  polygon: [number, number][]
  points: ScenarioPoint[]
}

export const scenarios: Scenario[]
