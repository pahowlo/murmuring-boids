import { vec2 } from "gl-matrix"
import { isInPolygon } from "./rayCasting2D"

import { scenarios } from "./__tests___/scenarios"

describe("Polygon scenarios", () => {
  for (const [idx, scenario] of scenarios.entries()) {
    describe(`Scenario #${idx + 1}`, () => {
      for (const [ptIdx, pt] of scenario.points.entries()) {
        const position = vec2.fromValues(pt.coord[0], pt.coord[1])
        const polygon = scenario.polygon.map((coord) => vec2.fromValues(coord[0], coord[1]))

        test(`${ptIdx}: (${pt.coord}) ${pt.isInPolygon ? "" : "not "}in polygon`, () => {
          const result = isInPolygon(position, polygon)
          expect(result).toBe(pt.isInPolygon)
        })
      }
    })
  }
})
