import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import {
  parseMediaFromTitle,
  parseMediaString,
  parseMultipleRegex,
  RegexUtils,
} from '@/content/controller/danmaku/integration/xPathPolicyOps/regexMatcher'
import type { MediaElements } from '../observers/MediaObserver'

const getText = (elements: MediaElements) => {
  return {
    title: elements.title.textContent,
    episode: elements.episode?.textContent ?? null,
    season: elements.season?.textContent ?? null,
    episodeTitle: elements.episodeTitle?.textContent ?? null,
  }
}

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
    const elements = getText(matchResult)
    const titleText = elements.title

    if (!titleText) {
      return {
        success: false,
        error: 'Title element not found',
      }
    }

    // If titleOnly is true, then try to parse the media info from the title alone
    if (policy.options.titleOnly) {
      const extracted = parseMediaFromTitle(titleText, policy.title.regex)
      const mediaInfo = new MediaInfo(
        extracted.title,
        extracted.episode ?? 1,
        extracted.season,
        undefined
      )
      return {
        success: true,
        mediaInfo: mediaInfo,
      }
    }

    // Title Extraction
    let title = RegexUtils.extractTitle(titleText, policy.title.regex)

    if (title === undefined || title === null) {
      return {
        success: false,
        error: `Error parsing title: ${JSON.stringify({
          title: titleText,
          regex: policy.title.regex,
        })}`,
      }
    }

    // Default to 1 if the element is not present
    let episode = 1
    let episodeTitle: string | undefined = undefined

    // Episode Extraction
    if (elements.episode) {
      const parsedEpisode = RegexUtils.extractEpisode(
        elements.episode,
        policy.episode.regex
      )
      if (parsedEpisode !== null && parsedEpisode !== undefined) {
        episode = parsedEpisode.value as number
      }
    }

    // Season Extraction & Merging
    if (elements.season) {
      const parsedSeason = RegexUtils.extractSeason(
        elements.season,
        policy.season.regex
      )
      if (parsedSeason) {
        // Intelligent Merging:
        // If we found a season string (e.g. "S1", "第1季"), append it to title if not present.
        // We use the raw match (e.g. "S2") to append.
        const rawSeason = parsedSeason.raw

        // Simple check to see if title already contains this indication
        if (!title.includes(rawSeason)) {
          title = `${title} ${rawSeason}`
        }

        // We do NOT pass season to MediaInfo because MediaInfo's constructor uses it to decorate
        // the title further (e.g. adding "Season X"). Since we manually merged it into the title "My Show S1",
        // we don't want MediaInfo to make it "My Show S1 Season 1".
        // SO: season remains undefined in MediaInfo constructor call.
      }
    }

    // Episode Title
    if (elements.episodeTitle) {
      // Assuming this is just string extraction, maybe clean it up?
      // Old: parseMultipleRegex(parseMediaString, ...)
      // We can stick to old parseMultipleRegex or use extractTitle/generic string extractor
      const parsedEpTitle = parseMultipleRegex(
        parseMediaString,
        elements.episodeTitle,
        policy.episodeTitle.regex
      )
      if (parsedEpTitle) {
        episodeTitle = parsedEpTitle
      }
    }

    return {
      success: true,
      mediaInfo: new MediaInfo(title, episode, undefined, episodeTitle),
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
