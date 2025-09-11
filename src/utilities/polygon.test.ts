import { vec2 } from "gl-matrix"
import { validatePolygon } from "./polygon"
import { describe, test, expect } from "vitest"

import { scenarios } from "./__tests___/scenarios"

describe("Polygon scenarios", () => {
  for (const [idx, scenario] of scenarios.entries()) {
    describe(`Scenario #${idx + 1}`, () => {
      const polygon = scenario.polygon.map((coord) => vec2.fromValues(coord[0], coord[1]))

      const validatedPolygon = validatePolygon(polygon)

      test(`Standard polygon scenarios should be unchanged by validation`, () => {
        expect(validatedPolygon).toEqual(polygon)
      })
    })
  }
})
