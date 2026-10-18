export type Entity = number

type TypedArray = Float32Array | Int32Array | Uint8Array
export type ColumnSpec<T extends TypedArray = TypedArray> = {
  type: { new (length: number): T }
  stride: number
}
export type Schema = Record<string, ColumnSpec>
type ColumnOf<C> = C extends ColumnSpec<infer T> ? T : never

/**
 * Table of entities sharing the same set of components.
 * Typed-array columns (SoA) + per-row subarray views (allocated once per growth).
 */
export class Archetype<S extends Schema, O extends object = object> {
  readonly schema: S
  count = 0
  private capacity: number

  readonly entities: Entity[] = [] // row -> entity
  private readonly rawColumns: Record<string, TypedArray> = {}
  private readonly rawViews: Record<string, TypedArray[]> = {}
  private readonly rawObjects: Record<string, unknown[]> = {}

  /** Column per component. */
  readonly columns = this.rawColumns as unknown as { [K in keyof S]: ColumnOf<S[K]> }
  /** Row view per component: views.position[row] is a vec3 view into columns.position. */
  readonly views = this.rawViews as unknown as { [K in keyof S]: ColumnOf<S[K]>[] }
  /** Non-numeric component per row. */
  readonly objects = this.rawObjects as unknown as { [K in keyof O]: O[K][] }

  constructor(schema: S, objectKeys: (keyof O & string)[] = [], initialCapacity: number = 64) {
    this.schema = schema
    this.capacity = Math.max(1, initialCapacity)
    for (const key of objectKeys) {
      this.rawObjects[key] = []
    }
    this.allocate(this.capacity)
  }

  private allocate(capacity: number): void {
    for (const key in this.schema) {
      const { type, stride } = this.schema[key]
      const prev = this.rawColumns[key]
      const column = new type(capacity * stride)
      if (prev) column.set(prev)
      this.rawColumns[key] = column

      const views: TypedArray[] = []
      for (let row = 0; row < capacity; row++) {
        views.push(column.subarray(row * stride, (row + 1) * stride))
      }
      this.rawViews[key] = views
    }
    this.capacity = capacity
  }

  /** Append a zeroed row. */
  addRow(entity: Entity, objects: O): number {
    if (this.count >= this.capacity) {
      this.allocate(this.capacity * 2)
    }
    const row = this.count++
    for (const key in this.rawViews) {
      this.rawViews[key][row].fill(0)
    }
    for (const key in this.rawObjects) {
      this.rawObjects[key][row] = (objects as Record<string, unknown>)[key]
    }
    this.entities[row] = entity
    return row
  }

  /** Copy components shared with source archetype. */
  copyRowFrom(row: number, source: AnyArchetype, sourceRow: number): void {
    for (const key in this.rawViews) {
      const sourceViews = source.rawViews[key]
      if (sourceViews) {
        this.rawViews[key][row].set(sourceViews[sourceRow])
      }
    }
  }

  /** Swap-and-pop removal. Return the entity moved into `row`, if any. */
  removeRow(row: number): Entity | undefined {
    const last = this.count - 1
    let moved: Entity | undefined
    if (row !== last) {
      for (const key in this.schema) {
        const { stride } = this.schema[key]
        this.rawColumns[key].copyWithin(row * stride, last * stride, (last + 1) * stride)
      }
      for (const key in this.rawObjects) {
        this.rawObjects[key][row] = this.rawObjects[key][last]
      }
      moved = this.entities[last]
      this.entities[row] = moved
    }
    for (const key in this.rawObjects) {
      this.rawObjects[key].length = last
    }
    this.entities.length = last
    this.count = last
    return moved
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArchetype = Archetype<any, any>

export class World {
  private nextEntity: Entity = 0
  private locations: Map<Entity, { archetype: AnyArchetype; row: number }> = new Map()

  spawn<S extends Schema, O extends object>(archetype: Archetype<S, O>, objects: O): Entity {
    const entity = this.nextEntity++
    const row = archetype.addRow(entity, objects)
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
  move<S extends Schema, O extends object>(
    entity: Entity,
    target: Archetype<S, O>,
    objects: O,
  ): void {
    const location = this.locations.get(entity)
    if (!location || location.archetype === target) return

    const row = target.addRow(entity, objects)
    target.copyRowFrom(row, location.archetype, location.row)
    this.detach(location.archetype, location.row)
    this.locations.set(entity, { archetype: target, row })
  }

  /** Return location of entity. Undefined if despawned. */
  locate(entity: Entity): { archetype: AnyArchetype; row: number } | undefined {
    return this.locations.get(entity)
  }

  private detach(archetype: AnyArchetype, row: number): void {
    const moved = archetype.removeRow(row)
    if (moved !== undefined) {
      const movedLocation = this.locations.get(moved)
      if (movedLocation) movedLocation.row = row
    }
  }
}
