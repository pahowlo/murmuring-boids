import { vec3 } from "gl-matrix"

interface Item {
  getPosition(): vec3
}

export class IncrementalSpatialGrid<T extends Item> {
  readonly cellSize: vec3
  private grid: Map<string, T[]>
  private prevCellKeys: Map<T, string> = new Map()

  constructor(cellSize: { x: number; y: number }) {
    this.cellSize = vec3.fromValues(cellSize.x, cellSize.y, 0)
    this.grid = new Map<string, T[]>()
  }

  private getCellKey(pos: vec3): string {
    return `${Math.floor(pos[0] / this.cellSize[0])},${Math.floor(pos[1] / this.cellSize[1])}`
  }

  update(item: T): void {
    const pos = item.getPosition()
    const cellKey = this.getCellKey(pos)

    const prevCellKey = this.prevCellKeys.get(item)
    if (prevCellKey === cellKey) {
      return // Nothing to do
    }

    // Remove item from old cell if found
    // N.B. prevCellKey should only be undefined if the item was just created.
    // Should be safe, but a lifetime attribute can be added if a bug gets introduced here.
    if (prevCellKey) {
      const prevCell = this.grid.get(prevCellKey)
      if (prevCell) {
        const idx = prevCell.indexOf(item)
        if (idx !== -1) {
          if (prevCell.length == 1) {
            // Remove empty cell
            this.grid.delete(prevCellKey)
          } else {
            // Swap and drop for O(1) removal
            prevCell[idx] = prevCell[prevCell.length - 1]
            prevCell.pop()
          }
        }
      }
    }

    // Add item to new cell
    const cell = this.grid.get(cellKey)
    if (cell) {
      cell.push(item)
    } else {
      this.grid.set(cellKey, [item])
    }
    this.prevCellKeys.set(item, cellKey)
  }

  /**
   * Fetch all neighbors in the diamond-shaped area around the item of gridDistance length.
   */
  getNeighbors(item: T, gridDistance: number, maxCount: number = 1_000): T[] {
    const cellKey = this.getCellKey(item.getPosition())

    const neighbors: T[] = []
    let neighborCount = 0

    const cell = this.grid.get(cellKey)
    if (cell) {
      for (const neighbor of cell) {
        if (neighbor === item) continue // Skip self

        neighbors.push(neighbor)
        neighborCount++
        if (neighborCount >= maxCount) {
          return neighbors // early return since we have enough neighbors
        }
      }
    }

    const [centerX, centerY] = cellKey.split(",").map(Number)

    for (let radius = 1; radius <= gridDistance; radius++) {
      // Explore diamond shape by slowly increasing the radius
      for (const { dx, dy } of this.diamondSpiralIterator(radius)) {
        const neighborCell = this.grid.get(`${centerX + dx},${centerY + dy}`)
        if (!neighborCell) continue // Skip empty cells

        const limitReached = neighborCount + neighborCell.length >= maxCount
        if (limitReached) {
          neighbors.push(...neighborCell.slice(0, maxCount - neighborCount))
          return neighbors // early return since we have enough neighbors
        }

        neighbors.push(...neighborCell)
        neighborCount += neighborCell.length
      }
    }
    return neighbors
  }

  private *diamondSpiralIterator(radius: number): IterableIterator<{ dx: number; dy: number }> {
    let dx = radius
    let dy = 0
    yield { dx, dy }

    while (dx > 0) {
      dx--
      dy++
      yield { dx, dy }
    }
    while (dx > -radius) {
      dx--
      dy--
      yield { dx, dy }
    }
    while (dx < 0) {
      dx++
      dy--
      yield { dx, dy }
    }
    while (dx < radius) {
      dx++
      dy++
      yield { dx, dy }
    }
  }
}
