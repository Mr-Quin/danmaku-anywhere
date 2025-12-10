import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import {
  parseMediaString,
  parseMultipleRegex,
  sortSelectors,
} from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'
import type { MediaElements } from '../observers/MediaObserver'
import { MediaParser } from './MediaParser'

type MediaExtractionResult =
  | {
      success: true
      mediaInfo: MediaInfo
    }
  | {
      success: false
      error: string
    }

export function extractMediaInfo(
  matchResult: MediaElements,
  policy: IntegrationPolicy
): MediaExtractionResult {
  try {
    // 1. Parse using Pipeline
    const parser = new MediaParser()
    const rawTitle = matchResult.title.textContent || ''
    const rawSeason = matchResult.season?.textContent
    const rawEpisode = matchResult.episode?.textContent
    const titleField = {
      value: rawTitle,
      regex: sortSelectors(policy.title.regex),
    }
    const seasonField = rawSeason
      ? {
          value: rawSeason,
          regex: sortSelectors(policy.season.regex),
        }
      : undefined
    const episodeField = rawEpisode
      ? {
          value: rawEpisode,
          regex: sortSelectors(policy.episode.regex),
        }
      : undefined

    const result = parser.parse({
      title: titleField,
      season: seasonField,
      episode: episodeField,
    })

    // 2. Map to MediaInfo model
    // Note: MediaInfo construction logic might need to be carefully mapped
    const { searchTitle, episode } = result
    let episodeTitle: string | undefined = undefined

    // 3. Handle Episode Title (Legacy/Additional Logic)
    // The parser doesn't explicitly handle episode title separate from the main pipeline yet,
    // so we keep the original logic for that part if it exists.
    if (matchResult.episodeTitle?.textContent) {
      const parsedEpTitle = parseMultipleRegex(
        parseMediaString,
        matchResult.episodeTitle.textContent,
        policy.episodeTitle.regex
      )
      if (parsedEpTitle) {
        episodeTitle = parsedEpTitle
      } else {
        // If no regex matched, use the raw text if available?
        // Old logic implied if parseMultipleRegex returns undefined, we get undefined.
        // But strict reading says if episodeTitle element exists, we might want it.
        // The old code:
        /*
            const parsedEpTitle = parseMultipleRegex(...)
            if (parsedEpTitle) episodeTitle = parsedEpTitle
          */
        // So if regex fails, we don't set it.
      }
    }

    // MediaInfo constructor:
    // (seasonTitle: string, episode: number, seasonDecorator?: string, episodeTitle?: string)
    // We pass searchTitle as seasonTitle because that's what we want to search for.
    // We leave seasonDecorator undefined because we merged season info into searchTitle already.
    const mediaInfo = new MediaInfo(
      searchTitle,
      episode,
      undefined,
      episodeTitle
    )

    return {
      success: true,
      mediaInfo,
    }
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : 'An unknown error occurred during media info extraction.',
    }
  }
}
