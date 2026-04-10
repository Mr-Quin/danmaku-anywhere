import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@/common/danmaku/enums'

class UnsupportedProviderException extends Error {
  constructor(provider: DanmakuSourceType, message?: string) {
    super(`Unsupported provider: ${provider}${message ? `: ${message}` : ''}`)
  }
}

export function assertProviderType<
  T extends { provider: DanmakuSourceType },
  S extends DanmakuSourceType,
>(data: T, provider: S): asserts data is Extract<T, { provider: S }> {
  if (data.provider !== provider) {
    throw new UnsupportedProviderException(
      data.provider,
      `expected ${provider}`
    )
  }
}

export function isProvider<
  T extends { provider: DanmakuSourceType },
  S extends DanmakuSourceType,
>(data: T, provider: S): data is Extract<T, { provider: S }> {
  return data.provider === provider
}

export function isNotCustom<T extends { provider: DanmakuSourceType }>(
  data: T
): data is Exclude<T, { provider: DanmakuSourceType.MacCMS }> {
  return data.provider !== DanmakuSourceType.MacCMS
}

export const episodeToString = (episode: GenericEpisodeLite) => {
  if (isNotCustom(episode)) {
    return `${episode.season.title} - ${episode.title}`
  }
  return episode.title
}

/**
 * Split a custom episode path-like title into a folder path and filename.
 * Leading/trailing slashes are stripped. Empty segments are discarded.
 */
export const splitCustomEpisodePath = (title: string) => {
  const parts = title.split('/').filter(Boolean)
  const fileName = parts.pop() ?? title
  return {
    parts,
    folderPath: parts.join('/'),
    fileName,
  }
}
