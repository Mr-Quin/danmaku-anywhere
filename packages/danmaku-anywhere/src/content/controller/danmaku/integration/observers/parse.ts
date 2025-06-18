import { getElementByXpath } from '@/common/utils/utils'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

export interface Selector {
  value: string
  quick: boolean
}

export const sortSelectors = (selectors: Selector[]) => {
  const quick = selectors.filter((s) => s.quick)
  const slow = selectors.filter((s) => !s.quick)
  return [...quick, ...slow].map((s) => s.value)
}

export const getFirstElement = (
  selectors: Selector[],
  parent = window.document
) => {
  for (const p of sortSelectors(selectors)) {
    const element = getElementByXpath(p, parent)
    if (element) {
      return element
    }
  }
  return null
}

/**
 * For parsing numbers like episode and season numbers
 */
export const parseMediaNumber = (text: string, regex: string) => {
  const match = text.match(new RegExp(regex, 'im'))

  if (match === null) {
    throw new Error(
      `Error parsing number.\nRegex ${regex} does not match text \`${text}\``
    )
  }

  // Prefer the first capture group if it exists
  const parseIndex = match[1] ? 1 : 0
  const parsed = Number.parseInt(match[parseIndex])

  if (isNaN(parsed)) {
    throw new Error(
      `Matched \`${match}\` in \`${text}\` using ${regex}, but parsing at index ${parseIndex} as number resulted in NaN`
    )
  }

  return parsed
}

/**
 * For parsing strings like season and episode titles
 */
export const parseMediaString = (text: string, regex: string) => {
  const match = text.match(new RegExp(regex, 'im'))

  if (match === null) {
    throw new Error(
      `Error parsing string.\nRegex ${regex} does not match text \`${text}\``
    )
  }

  // Prefer the first capture group if it exists
  return match[1] ?? match[0]
}

export const parseMultipleRegex = <T>(
  parser: (text: string, regex: string) => T,
  text: string,
  regex: Selector[]
): T | undefined => {
  const errors: string[] = []

  for (const reg of sortSelectors(regex)) {
    try {
      if (reg === '') return
      return parser(text, reg)
    } catch (err) {
      if (err instanceof Error) {
        errors.push(err.message)
      }
    }
  }

  throw new Error(errors.join('\n'))
}

// Try to parse the media info from the title alone
// Expect regex to use named capture groups
export const parseMediaFromTitle = (
  title: string,
  regex: Selector[]
): MediaInfo => {
  const errors: string[] = []

  for (const reg of sortSelectors(regex)) {
    try {
      const match = title.match(new RegExp(reg, 'i'))

      if (match === null) {
        errors.push(
          `Error parsing media from title.\nRegex \`${reg}\` does not match text \`${title}\``
        )
        continue
      }

      const titleText = match.groups?.title
      const episode = match.groups?.episode
      const season = match.groups?.season
      const episodeTitle = match.groups?.episodeTitle

      // Title must be present
      if (!titleText) {
        errors.push(
          `Matched \`${match}\` in \`${title}\` using \`${reg}\`, but the title is not found. Did you forget to name the capture group?`
        )
        continue
      }

      // If the episode is not present, assume this is non-episodic
      if (!episode) {
        return new MediaInfo(titleText, 1, season, episodeTitle)
      }

      const episodeNumber = Number.parseInt(episode)

      if (isNaN(episodeNumber)) {
        errors.push(
          `Matched \`${match}\` in \`${title}\` using ${reg}, but parsing episode number resulted in NaN`
        )
        continue
      }

      return new MediaInfo(titleText, episodeNumber, season, episodeTitle)
    } catch (err) {
      if (err instanceof Error) {
        errors.push(err.message)
      }
    }
  }

  throw new Error(errors.join('\n'))
}
