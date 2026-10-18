export type Entity = number

/**
 * Table of entities sharing the same set of components.
 * K: component names, each stored as a Float32Array column (SoA) with a fixed stride.
 */
export class Archetype<K extends string> {
  readonly strides: Record<K, number>
  count = 0
  private capacity = 0

  readonly entities: Entity[] = [] // row -> entity
  readonly columns = {} as Record<K, Float32Array>
  /** Row views: views.position[row] is a subarray of columns.position. */
  readonly views = {} as Record<K, Float32Array[]>

  constructor(strides: Record<K, number>, initialCapacity = 64) {
    this.strides = strides
    this.allocate(Math.max(1, initialCapacity))
  }

  private allocate(capacity: number): void {
    for (const key in this.strides) {
      const stride = this.strides[key]
      const column = new Float32Array(capacity * stride)
      const prev = this.columns[key]
      if (prev) column.set(prev)
      this.columns[key] = column

      const views: Float32Array[] = []
      for (let row = 0; row < capacity; row++) {
        views.push(column.subarray(row * stride, (row + 1) * stride))
      }
      this.views[key] = views
    }
    this.capacity = capacity
  }

  /** Append a zeroed row. */
  addRow(entity: Entity): number {
    if (this.count >= this.capacity) this.allocate(this.capacity * 2)
    const row = this.count++
    for (const key in this.strides) {
      const stride = this.strides[key]
      this.columns[key].fill(0, row * stride, (row + 1) * stride)
    }
    this.entities[row] = entity
    return row
  }

  /** Copy components shared with source archetype. */
  copyRowFrom(row: number, source: Archetype<string>, sourceRow: number): void {
    for (const key in this.views) {
      const sourceViews = source.views[key]
      if (sourceViews) this.views[key][row].set(sourceViews[sourceRow])
    }
  }

  /** Swap-and-pop removal. Return the entity moved into `row`, if any. */
  removeRow(row: number): Entity | undefined {
    const last = this.count - 1
    const moved = row !== last ? this.entities[last] : undefined
    for (const key in this.strides) {
      const stride = this.strides[key]
      this.columns[key].copyWithin(row * stride, last * stride, (last + 1) * stride)
    }
    this.entities[row] = this.entities[last]
    this.entities.length = last
    this.count = last
    return moved
  }
}

export type Location = { archetype: Archetype<string>; row: number }

export class World {
  private nextEntity: Entity = 0
  private locations = new Map<Entity, Location>()

  spawn(archetype: Archetype<string>): Entity {
    const entity = this.nextEntity++
    const row = archetype.addRow(entity)
    this.locations.set(entity, { archetype, row })
    return entity
  }

  despawn(entity: Entity): void {
    const location = this.locations.get(entity)
    if (!location) return
    this.detach(location.archetype, location.row)
    this.locations.delete(entity)
  }

  /** Move entity to another archetype, copying the components both archetypes share. */
  move(entity: Entity, target: Archetype<string>): void {
    const location = this.locations.get(entity)
    if (!location || location.archetype === target) return

    const row = target.addRow(entity)
    target.copyRowFrom(row, location.archetype, location.row)
    this.detach(location.archetype, location.row)
    this.locations.set(entity, { archetype: target, row })
  }

  /** Return location of entity. Throw if despawned. */
  locate(entity: Entity): Readonly<Location> {
    const location = this.locations.get(entity)
    if (!location) throw new Error(`Entity ${entity} not found`)
    return location
  }

  private detach(archetype: Archetype<string>, row: number): void {
    const moved = archetype.removeRow(row)
    if (moved === undefined) return
    const movedLocation = this.locations.get(moved)
    if (movedLocation) movedLocation.row = row
  }
}
