/**
 * Shuffle array in-place, using Fisher-Yates method.
 */
export function shuffle<T>(items: T[]): void {
  let items_i
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    // Swap items randomly while preserving the indexes greater than i
    items_i = items[i]
    items[i] = items[j]
    items[j] = items_i
  }
}

/**
 * Return k length random subset of unique items from array (sample without replacement),
 * using reservoir sampling with Fisher-Yates shuffle.
 */
export function sample<T>(items: T[], k: number): T[] {
  if (k >= items.length) {
    return items.slice() // Copy
  }

  const out: T[] = []

  for (let i = 0; i < k; i++) {
    // Fill as reservoir with first k items
    out[i] = items[i]
  }
  for (let i = k; i < items.length; i++) {
    // Check if we should perform a random swap with an item in reservoir
    const j = Math.floor(Math.random() * (i + 1))
    if (j < k) {
      out[j] = items[i]
    }
  }
  // The chance to select an item is the probability to pick it, then not to swap it.
  // For the first k items, it is: 1 * prod(i=k to n) (1 - 1/i) => k / n.
  // For the rest, it is: (k/idx+1) * prod(i=idx+1 to n) (1 - 1/i) => k / n.
  return out
}

/**
 * Return k random elements from array (sample with replacement).
 */
export function choices<T>(items: T[], k: number): T[] {
  const size = items.length
  if (size === 0) return []

  const out: T[] = []
  for (let _ = 0; _ < k; _++) {
    const i = Math.floor(Math.random() * size)
    out.push(items[i])
  }
  return out
}
