import type {
  CustomEpisodeLite,
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@/common/danmaku/enums'

// Boolean predicate only — does not narrow `providerIds`.
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
  return 'isCustom' in season && season.isCustom === true
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
