import {
  type CustomSeason,
  DanmakuSourceType,
  type GenericEpisode,
  type GenericEpisodeLite,
  providerTypeFromManifestId,
  type Season,
  type SeasonInsert,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

type AnyEpisode =
  | GenericEpisode
  | GenericEpisodeLite
  | (WithSeason<object> & { seasonId: number })

// Source-backed episodes carry a seasonId; custom episodes do not. The split
// keys on seasonId because, with `provider` gone, a source episode is
// structurally a superset of a custom one, so narrowing must go through the
// distinguishing seasonId rather than the custom types.
export function isSourceEpisode<T extends AnyEpisode>(
  x: T
): x is Extract<T, { seasonId: number }> {
  return 'seasonId' in x
}

export function isCustomEpisode<T extends AnyEpisode>(
  x: T
): x is Exclude<T, { seasonId: number }> {
  return !('seasonId' in x)
}

export function isCustomSeason(
  season: Season | SeasonInsert | CustomSeason
): season is CustomSeason {
  return 'isCustom' in season && season.isCustom === true
}

export function episodeProviderType<T extends AnyEpisode>(
  episode: T
): DanmakuSourceType | undefined {
  if (!isSourceEpisode(episode)) {
    return DanmakuSourceType.MacCMS
  }
  return episode.season.manifestId
    ? providerTypeFromManifestId(episode.season.manifestId)
    : undefined
}

export function seasonProviderType(
  season: Season | SeasonInsert | CustomSeason
): DanmakuSourceType | undefined {
  if (isCustomSeason(season)) {
    return DanmakuSourceType.MacCMS
  }
  return season.manifestId
    ? providerTypeFromManifestId(season.manifestId)
    : undefined
}

export const episodeToString = (episode: GenericEpisodeLite) => {
  if (isSourceEpisode(episode)) {
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
