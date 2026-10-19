import { vec3 } from "gl-matrix"

import { sample } from "./random"

export type CellCoords = { startX: number; startY: number; width: number; height: number }

interface ItemReader<T> {
  position(item: T): Readonly<vec3>
  velocity(item: T): Readonly<vec3>
}

type CellKey = number

export class Cell {
  readonly size: vec3

  constructor(size: { x: number; y: number; z: number }) {
    this.size = vec3.fromValues(size.x, size.y, size.z)
  }

  encode(x: number, y: number, z: number): CellKey {
    // 10 bits per axis (-512 to 511 range) packed into 30 bits
    return ((x & 0x3ff) | ((y & 0x3ff) << 10) | ((z & 0x3ff) << 20)) as CellKey
  }

  decode(key: CellKey): [number, number, number] {
    // Extract and sign-extend 10-bit integers using 22-bit shifts
    return [((key & 0x3ff) << 22) >> 22, (((key >> 10) & 0x3ff) << 22) >> 22, (((key >> 20) & 0x3ff) << 22) >> 22]
  }

  getKey(pos: Readonly<vec3>): CellKey {
    const x = Math.floor(pos[0] / this.size[0])
    const y = Math.floor(pos[1] / this.size[1])
    const z = Math.floor(pos[2] / this.size[2])
    return this.encode(x, y, z)
  }
}

// Main class
export class IncrementalSpatialGrid<T> {
  private cell: Cell
  readonly cellRadius: number

  centerOwMass: vec3 = vec3.fromValues(500, 500, 100)
  private centerOwMassAlpha: number

  private grid: Map<CellKey, T[]> = new Map()
  private itemCellKeys: Map<T, CellKey> = new Map()
  private reader: ItemReader<T>

  constructor(cellSize: { x: number; y: number; z: number }, maxItemCount: number, reader: ItemReader<T>) {
    this.reader = reader
    this.cell = new Cell(cellSize)
    this.cellRadius = Math.max(cellSize.x, cellSize.y, cellSize.z)
    this.centerOwMassAlpha = 2 / (maxItemCount + 1)
  }

  setMaxItemCount(value: number): void {
    this.centerOwMassAlpha = 2 / (value + 1)
  }
  remove(item: T): void {
    const cellKey = this.itemCellKeys.get(item)
    if (!cellKey) return // Not found

    this.removeFromGrid(item, cellKey)
    this.itemCellKeys.delete(item)
  }

  update(item: T): void {
    const pos = this.reader.position(item)
    const newCellKey = this.cell.getKey(pos)

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

    // Update mass center
    vec3.scale(this.centerOwMass, this.centerOwMass, 1 - this.centerOwMassAlpha)
    const nextPos = vec3.scaleAndAdd(vec3.create(), pos, this.reader.velocity(item), 2)
    vec3.scaleAndAdd(this.centerOwMass, this.centerOwMass, nextPos, this.centerOwMassAlpha)
  }

  clear(): void {
    this.grid.clear()
    this.itemCellKeys.clear()
  }

  getRandomCellCoords(): CellCoords | undefined {
    const cellKeys = Array.from(this.grid.keys())
    if (cellKeys.length === 0) return undefined

    const i = Math.floor(Math.random() * cellKeys.length)
    const [cellX, cellY] = this.cell.decode(cellKeys[i])
    return {
      startX: cellX * this.cell.size[0],
      startY: cellY * this.cell.size[1],
      width: this.cell.size[0],
      height: this.cell.size[1],
    }
  }

  /**
   * Fetch all neighbors in the diamond-shaped area around the item of gridDistance length.
   */
  getNeighbors(item: T, gridDistance: { min: number; max: number; limitCount?: number }): T[] {
    const cellKey = this.cell.getKey(this.reader.position(item))

    const neighbors: T[] = []
    let remainingCount = gridDistance.limitCount || 100

    let minGridDistance = Math.max(0, gridDistance.min)
    if (minGridDistance === 0) {
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

    const [centerX, centerY, centerZ] = this.cell.decode(cellKey)

    for (let radius = minGridDistance; radius <= gridDistance.max; radius++) {
      // Explore diamond shape by slowly increasing the radius
      const nextNeighbors = []
      for (const [dx, dy, dz] of this.diamondSpiralIterator(radius)) {
        const neighborCell = this.grid.get(this.cell.encode(centerX + dx, centerY + dy, centerZ + dz))
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

  private removeFromGrid(item: T, cellKey: CellKey): void {
    const cell = this.grid.get(cellKey)
    if (!cell) return // Not found

    const idx = cell.indexOf(item)
    if (idx === -1) return // Not found

    if (cell.length === 1) {
      // Remove empty cell
      this.grid.delete(cellKey)
      return
    }
    // Swap and drop for O(1) removal
    cell[idx] = cell[cell.length - 1]
    cell.pop()
  }

  private *diamondSpiralIterator(radius: number): IterableIterator<[number, number, number]> {
    if (radius < 0) {
      yield [0, 0, 0]
      return
    }

    for (let dx = -radius; dx <= radius; dx++) {
      const remX = radius - Math.abs(dx)
      for (let dy = -remX; dy <= remX; dy++) {
        const dz = remX - Math.abs(dy)
        yield [dx, dy, dz]
        if (dz !== 0) {
          yield [dx, dy, -dz]
        }
      }
    }
  }
}
