import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import {
  parseMediaFromTitle,
  parseMediaNumber,
  parseMediaString,
  parseMultipleRegex,
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

export function extractMediaInfo(
  matchResult: MediaElements,
  policy: IntegrationPolicy
): MediaInfo {
  const elements = getText(matchResult)
  const titleText = elements.title

  if (!titleText) {
    throw new Error('Title element not found')
  }

  // If titleOnly is true, then try to parse the media info from the title alone
  if (policy.options.titleOnly) {
    return parseMediaFromTitle(titleText, policy.title.regex)
  }

  const title = parseMultipleRegex(
    parseMediaString,
    titleText,
    policy.title.regex
  )

  if (title === undefined) {
    throw new Error(
      `Error parsing title: ${JSON.stringify({
        title: titleText,
        regex: policy.title.regex,
      })}`
    )
  }

  // Default to 1 if the element is not present
  let episode = 1
  let episodeTitle: string | undefined = undefined
  let season: string | undefined = undefined

  // If the episode element is not present, assume it's a movie or something that doesn't have episodes
  if (elements.episode) {
    const parsedEpisode = parseMultipleRegex(
      parseMediaNumber,
      elements.episode,
      policy.episode.regex
    )
    if (parsedEpisode !== undefined) {
      episode = parsedEpisode
    }
  }

  if (elements.season) {
    season = parseMultipleRegex(
      parseMediaString,
      elements.season,
      policy.season.regex
    )
  }

  if (elements.episodeTitle) {
    episodeTitle = parseMultipleRegex(
      parseMediaString,
      elements.episodeTitle,
      policy.episodeTitle.regex
    )
  }

  return new MediaInfo(title, episode, season, episodeTitle)
}
