import { vec2 } from "gl-matrix"
import { isInPolygon } from "./rayCasting2D"

import { scenarios } from "./__tests___/rayCasting2D/scenarios"

describe("Polygon scenarios", () => {
  scenarios.forEach((scenario, idx) => {
    describe(`Scenario #${idx + 1}`, () => {
      scenario.points.forEach((pt, ptIdx) => {
        const position = vec2.fromValues(pt.coord[0], pt.coord[1])
        const polygon = scenario.polygon.map((coord) => vec2.fromValues(coord[0], coord[1]))

        test(`${ptIdx}: (${pt.coord}) ${pt.isInPolygon ? "" : "not "}in polygon`, () => {
          const result = isInPolygon(position, polygon)
          expect(result).toBe(pt.isInPolygon)
        })
      })
    })
  })
})
