import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'

/**
 * Folds a refresh that dropped invalid rows into the stored list. Replacing
 * with it would lose the dropped episodes and shift what counts as the next
 * one, so the stored stubs stay in place, updated from the refresh where the
 * indexedId matches, with episodes new to the refresh appended.
 */
export function mergeEpisodeStubs(
  stored: EpisodeStub[],
  fresh: EpisodeStub[]
): EpisodeStub[] {
  const freshById = new Map(fresh.map((stub) => [stub.indexedId, stub]))
  const merged = stored.map((stub) => freshById.get(stub.indexedId) ?? stub)
  const storedIds = new Set(stored.map((stub) => stub.indexedId))
  for (const stub of fresh) {
    if (!storedIds.has(stub.indexedId)) {
      merged.push(stub)
    }
  }
  return merged
}
