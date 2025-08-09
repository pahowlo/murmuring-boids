export function HashPatternStyle(color: string, spacing = 8): CanvasPattern {
  const patternCanvas = document.createElement("canvas")
  patternCanvas.width = patternCanvas.height = spacing
  const pCtx = patternCanvas.getContext("2d")
  if (!pCtx) throw new Error("Canvas context not available")

  pCtx.strokeStyle = color
  pCtx.lineWidth = 1

  // // Downward right diagonal line
  // pCtx.beginPath()
  // pCtx.moveTo(0, 0)
  // pCtx.lineTo(spacing, spacing)
  // pCtx.stroke()

  // Upward right diagonal line
  pCtx.beginPath()
  pCtx.moveTo(spacing, 0)
  pCtx.lineTo(0, spacing)
  pCtx.stroke()

  const pattern = pCtx.createPattern(patternCanvas, "repeat")
  if (!pattern) throw new Error("Failed to create pattern")

  return pattern
}
