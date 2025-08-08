/**
 * Frequency estimator that can be used to estimate FPS or TPS (Ticks per Second).
 */
export class FreqEstimator {
  private prevFrequency: number
  private prevTime: number
  // alpha ~ 2 / (N + 1) where N would be the number of frames to average
  // over if we were using a buffer list
  private alpha: number = 0.025

  constructor(targetFps: number) {
    this.prevFrequency = targetFps
    this.prevTime = performance.now()
  }

  get(): number {
    return this.prevFrequency
  }

  getPrevTime(): number {
    return this.prevTime
  }

  /** Return delta between if we are on target regarding fps */
  update(): void {
    const now = performance.now()
    const instantFreq = 1000 / (now - this.prevTime || 1)

    this.prevFrequency = this.prevFrequency * (1 - this.alpha) + this.alpha * instantFreq
    this.prevTime = now
  }
}
