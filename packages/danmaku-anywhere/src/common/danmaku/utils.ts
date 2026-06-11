import type {
  CustomEpisodeLite,
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@/common/danmaku/enums'

class UnsupportedProviderException extends Error {
  constructor(provider: DanmakuSourceType, message?: string) {
    super(`Unsupported provider: ${provider}${message ? `: ${message}` : ''}`)
  }
}

// Defensive runtime check. Does NOT narrow `providerIds` — that field is
// opaque at the type level. Use service-local boundary helpers (e.g.
// `seasonIds()`, `episodeIds()`) to read typed fields off `providerIds`
// at the point of access.
export function assertProviderType(
  data: { provider: DanmakuSourceType },
  provider: DanmakuSourceType
): void {
  if (data.provider !== provider) {
    throw new UnsupportedProviderException(
      data.provider,
      `expected ${provider}`
    )
  }
}

// Boolean predicate only — does not narrow `providerIds`. See
// `assertProviderType` for the rationale.
export function isProvider(
  data: { provider: DanmakuSourceType },
  provider: DanmakuSourceType
): boolean {
  return data.provider === provider
}

// Episode vs CustomEpisode is a structural distinction (CustomEpisode lacks
// a season and uses a different shape entirely), so the guard still narrows.
export function isNotCustom<T extends { provider: DanmakuSourceType }>(
  data: T
): data is Exclude<T, { provider: DanmakuSourceType.MacCMS }> {
  return data.provider !== DanmakuSourceType.MacCMS
}

// Source-backed episodes carry a seasonId; custom episodes do not.
export function isCustomEpisode(x: GenericEpisodeLite): x is CustomEpisodeLite {
  return !('seasonId' in x)
}

export function isCustomSeason(
  season: Season | CustomSeason
): season is CustomSeason {
  return !('providerConfigId' in season)
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
