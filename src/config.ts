import { BoidConfig } from "./types"

export const defaultRenderOptions = {
  canvasDepth: 500,
  backgroundColor: "#212121",
  boidColor: "#ffffff",
  boidSize: 5,
}

export const defaultBoidConfig: BoidConfig = {
  maxSpeed: 2,
  acceleration: {
    turnBack: 0.6,
    gravity: 0.025,
  },
}
