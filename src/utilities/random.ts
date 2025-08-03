/**
 * Perform fast in-place shuffle of given array using Fisher-Yates method.
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
 * Perform fast k non-repetitive sampling of given array
 * using reservoir sampling with Fisher-Yates shuffle.
 */
export function sample<T>(items: T[], k: number): T[] {
  if (k >= items.length) {
    return items.slice() // Copy
  }

  const reservoir: T[] = []

  for (let i = 0; i < k; i++) {
    // Fill reservoir with first k items
    reservoir[i] = items[i]
  }
  for (let i = k; i < items.length; i++) {
    // Check if we should perform a random swap with an item in reservoir
    const j = Math.floor(Math.random() * (i + 1))
    if (j < k) {
      reservoir[j] = items[i]
    }
  }
  // The chance to select an item is the probability to pick it, then not to swap it.
  // For the first k items, it is: 1 * prod(i=k to n) (1 - 1/i) => k / n.
  // For the rest, it is: (k/idx+1) * prod(i=idx+1 to n) (1 - 1/i) => k / n.
  return reservoir
}
