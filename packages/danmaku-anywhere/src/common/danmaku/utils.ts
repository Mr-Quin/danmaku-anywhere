import type {
  CustomSeason,
  GenericEpisode,
  GenericEpisodeLite,
  Season,
  SeasonInsert,
  WithSeason,
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
