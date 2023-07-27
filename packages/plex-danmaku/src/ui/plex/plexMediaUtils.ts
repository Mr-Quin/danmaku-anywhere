import { DanDanMedia } from '@/dandanplay/api'

export interface PlexMediaInfo {
  title: string
  season: number
  episode: number
}

export const mediaChangeType = (
  current: PlexMediaInfo | null,
  prev: PlexMediaInfo | null
) => {
  if (!current) {
    if (!prev) return 'none'
    return 'title'
  }

  if (!prev) return 'title'

  if (current.title !== prev.title) return 'title'

  if (current.season !== prev.season) return 'season'

  if (current.episode !== prev.episode) return 'episode'

  return 'none'
}

export const getEpisodeInfo = () => {
  const title = document.querySelector('title')
  // title format
  // ▶ [TITLE] - S[SEASON] · E[EPISODE]
  // [TITLE] - S[SEASON] · E[EPISODE]
  // ▶ [TITLE]
  // [TITLE]
  const titleRegex =
    /(?<title>[^\s]+)\s*-\s*S(?<season>\d+)\s*·\s*E(?<episode>\d+)/

  if (!title?.textContent) return null

  const match = titleRegex.exec(title.textContent)

  if (match) {
    // explictly write out the return type to avoid type error
    return {
      title: match.groups!.title,
      season: parseInt(match.groups!.season),
      episode: parseInt(match.groups!.episode),
    }
  }
  return null
}

// try to find the anime that matches the title
// if not found, use the first one, which may be wrong
export const matchAnimeTitle = (
  animes: DanDanMedia[],
  title: string,
  season: number
) => {
  if (animes.length === 0) {
    return null
  }

  const titleMatches = animes.filter((anime) =>
    anime.animeTitle.includes(title)
  )

  if (titleMatches.length > 0) {
    return titleMatches[season - 1] ?? titleMatches[0]
  }

  const seasonMatch = animes[season - 1]
  if (seasonMatch) seasonMatch

  return animes[0]
}

export const matchAnimeEpisode = (anime: DanDanMedia, episode: number) => {
  const exactEpisode = anime.episodes[episode - 1]
  if (exactEpisode) return exactEpisode

  if (!anime.episodes[0]) return null

  return anime.episodes[0]
}

export const getDanmakuContainer = () => {
  const container = document.querySelector(
    "div[class='Player-fullPlayerContainer-wBDz23']"
  ) as HTMLDivElement | null
  const media = document.querySelector('video') as HTMLMediaElement | null

  return { container, media }
}
