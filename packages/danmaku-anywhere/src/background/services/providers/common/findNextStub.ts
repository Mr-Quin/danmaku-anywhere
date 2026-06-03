import type { EpisodeStub } from '@danmaku-anywhere/danmaku-converter'

function toEpisodeNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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
