import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'

function toEpisodeNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const direct = Number(value)
  if (Number.isFinite(direct)) {
    return direct
  }
  // Try to extract a number from the episode
  const leading = value.match(/^\s*(\d+)/)
  return leading ? Number(leading[1]) : null
}

export function findNextStub(
  stubs: EpisodeStub[],
  current: Pick<EpisodeStub, 'episodeNumber' | 'indexedId'>
): EpisodeStub | null {
  const currentNumber = toEpisodeNumber(current.episodeNumber)
  if (currentNumber !== null) {
    const byNumber = stubs.find(
      (stub) => toEpisodeNumber(stub.episodeNumber) === currentNumber + 1
    )
    if (byNumber) {
      return byNumber
    }
  }

  const index = stubs.findIndex((stub) => stub.indexedId === current.indexedId)
  if (index !== -1 && stubs[index + 1]) {
    return stubs[index + 1]
  }

  return null
}
