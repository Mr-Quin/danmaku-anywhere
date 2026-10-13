import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'

/**
 * A refreshed episode list replaces the stored one unless it is shorter. A
 * shorter list may be a refresh that dropped invalid rows, and replacing with
 * it would shift what counts as the next episode, so the stored stubs stay in
 * place, updated from the refresh where the indexedId matches, with episodes
 * new to the refresh appended.
 */
export function mergeEpisodeStubs(
  stored: EpisodeStub[],
  fresh: EpisodeStub[]
): EpisodeStub[] {
  if (fresh.length >= stored.length) {
    return fresh
  }
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
