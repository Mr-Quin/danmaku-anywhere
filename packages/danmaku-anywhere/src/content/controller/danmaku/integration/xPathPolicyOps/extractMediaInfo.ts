import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { sortSelectors } from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'
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

    const episodeTitleField = matchResult.episodeTitle?.textContent
      ? {
          value: matchResult.episodeTitle.textContent,
          regex: sortSelectors(policy.episodeTitle.regex),
        }
      : undefined

    const result = parser.parse({
      title: titleField,
      season: seasonField,
      episode: episodeField,
      episodeTitle: episodeTitleField,
    })

    const mediaInfo = new MediaInfo({
      title: result.searchTitle,
      episode: result.episode,
      episodeTitle: result.episodeTitle,
      originalTitle: result.originalTitle,
    })

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
