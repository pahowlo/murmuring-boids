import { vec3 } from "gl-matrix"

import { sample } from "./random"

interface Item {
  getPosition(): Readonly<vec3>
}

// Main class
export class IncrementalSpatialGrid<T extends Item> {
  readonly cellSize: vec3
  readonly cellRadius: number

  private grid: Map<string, T[]> = new Map()
  private itemCellKeys: Map<T, string> = new Map()

  constructor(cellSize: { x: number; y: number }) {
    this.cellSize = vec3.fromValues(cellSize.x, cellSize.y, 0)
    this.cellRadius = Math.ceil(Math.sqrt((cellSize.x * cellSize.x + cellSize.y * cellSize.y) / 2))
  }

  private getCellKey(pos: Readonly<vec3>): string {
    return `${Math.floor(pos[0] / this.cellSize[0])},${Math.floor(pos[1] / this.cellSize[1])}`
  }

  remove(item: T): void {
    const cellKey = this.itemCellKeys.get(item)
    if (!cellKey) return // Not found

    this.removeFromGrid(item, cellKey)
    this.itemCellKeys.delete(item)
  }

  update(item: T): void {
    const pos = item.getPosition()
    const newCellKey = this.getCellKey(pos)

    const cellKey = this.itemCellKeys.get(item)
    if (cellKey === newCellKey) {
      return // Nothing to do
    }

    // Remove item from old cell if found
    // N.B. cellKey should only be undefined if the item was just created.
    // Should be safe, but a lifetime attribute can be added if a bug gets introduced here.
    if (cellKey) {
      this.removeFromGrid(item, cellKey)
    }

    // Add item to new cell
    const cell = this.grid.get(newCellKey)
    if (cell) {
      cell.push(item)
    } else {
      this.grid.set(newCellKey, [item])
    }
    this.itemCellKeys.set(item, newCellKey)
  }

  clear(): void {
    this.grid.clear()
    this.itemCellKeys.clear()
  }

  getRandomCellCoords():
    | { startX: number; startY: number; width: number; height: number }
    | undefined {
    const cellKeys = Array.from(this.grid.keys())
    if (cellKeys.length === 0) return undefined

    const i = Math.floor(Math.random() * cellKeys.length)
    const [cellX, cellY] = cellKeys[i].split(",").map(Number)
    return {
      startX: cellX * this.cellSize[0],
      startY: cellY * this.cellSize[1],
      width: this.cellSize[0],
      height: this.cellSize[1],
    }
  }

  /**
   * Fetch all neighbors in the diamond-shaped area around the item of gridDistance length.
   */
  getNeighbors(item: T, gridDistance: { min: number; max: number; limitCount?: number }): T[] {
    const cellKey = this.getCellKey(item.getPosition())

    const neighbors: T[] = []
    let remainingCount = gridDistance.limitCount || 100

    let minGridDistance = Math.max(0, gridDistance.min)
    if (minGridDistance == 0) {
      const cell = this.grid.get(cellKey)
      if (cell) {
        for (const neighbor of cell) {
          if (neighbor === item) continue // Skip self

          neighbors.push(neighbor)
          remainingCount--
          if (remainingCount <= 0) {
            return neighbors // early return since we have enough neighbors
          }
        }
      }
      minGridDistance++
    }

    const [centerX, centerY] = cellKey.split(",").map(Number)

    for (let radius = minGridDistance; radius <= gridDistance.max; radius++) {
      // Explore diamond shape by slowly increasing the radius
      const nextNeighbors = []
      for (const { dx, dy } of this.diamondSpiralIterator(radius)) {
        const neighborCell = this.grid.get(`${centerX + dx},${centerY + dy}`)
        if (!neighborCell) continue // Skip empty cells

        nextNeighbors.push(...neighborCell)
      }
      if (nextNeighbors.length >= remainingCount) {
        neighbors.push(...sample(nextNeighbors, remainingCount))
        return neighbors // early return since we have enough neighbors
      }

      neighbors.push(...nextNeighbors)
      remainingCount -= nextNeighbors.length
    }
    return neighbors
  }

  private removeFromGrid(item: T, cellKey: string): void {
    const cell = this.grid.get(cellKey)
    if (!cell) return // Not found

    const idx = cell.indexOf(item)
    if (idx === -1) return // Not found

    if (cell.length == 1) {
      // Remove empty cell
      this.grid.delete(cellKey)
      return
    }
    // Swap and drop for O(1) removal
    cell[idx] = cell[cell.length - 1]
    cell.pop()
  }

  private *diamondSpiralIterator(radius: number): IterableIterator<{ dx: number; dy: number }> {
    let dx = radius
    let dy = 0
    yield { dx, dy }

    if (radius === 0) return // No need to iterate

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
