export class FpsEstimator {
  private previousFps: number
  private lastFrameTime: number
  // alpha ~ 2 / (N + 1) where N would be the number of frames to average
  // over if we were using a buffer list
  private alpha: number = 0.025

  constructor(targetFps: number) {
    this.previousFps = targetFps
    this.lastFrameTime = performance.now()
  }

  getFps(): number {
    return this.previousFps
  }

  getLastFrameTime(): number {
    return this.lastFrameTime
  }

  /** Return delta between if we are on target regarding fps */
  update(): void {
    const now = performance.now()
    const instantFps = 1000 / (now - this.lastFrameTime || 1)

    this.previousFps = this.previousFps * (1 - this.alpha) + this.alpha * instantFps
    this.lastFrameTime = now
  }
}
