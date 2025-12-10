import { chineseToNumber } from './chineseToNumber'
import { RegexUtils } from './mediaRegexMatcher'
import type { ExtractorMatch, MediaInfoParseResult } from './types'

function normalizeText(text: string): string {
  return text.normalize('NFKC').trim()
}

interface ParserInputField {
  value: string
  regex: string[]
}

interface MediaParserInput {
  title: ParserInputField
  season?: ParserInputField | null
  episode?: ParserInputField | null
  episodeTitle?: ParserInputField | null
}

function convertToNumber(text: string | number): number | null {
  return typeof text === 'number' ? text : chineseToNumber(text)
}

export class MediaParser {
  public parse(input: MediaParserInput): MediaInfoParseResult {
    // 1. Gather Candidates
    const rawTitle = input.title
    const rawSeason = input.season
    const rawEpisode = input.episode
    const rawEpisodeTitle = input.episodeTitle

    // 2. Normalize (Optional but recommended for robust UX)
    // Converts full-width chars (１２３) to half-width (123), removes zero-width spaces
    const cleanTitleText = normalizeText(rawTitle.value)

    // 3. Extraction Pipeline
    let seasonMatch: ExtractorMatch | null = null
    let episodeMatch: ExtractorMatch | null = null
    let episodeTitle: string | undefined = undefined

    // --- STRATEGY: Named Capture Groups (Highest Priority for Title Only) ---
    // If title regex has named groups "title", "episode", "season", "episodeTitle", respect them.
    if (rawTitle.regex.length > 0) {
      // Check if any title regex produces a match with named groups
      const titleMatch = RegexUtils.runUserRegex(cleanTitleText, rawTitle.regex)
      if (titleMatch && titleMatch.groups) {
        const g = titleMatch.groups
        // If we have at least one useful group, we trust this strategy
        if (g.title || g.episode || g.season || g.episodeTitle) {
          // Update title to the captured title group
          if (g.title) {
            // We overwrite the raw title with the captured title for consolidation
            // But we might want to keep originalTitle for display?
            // "cleanTitleText" is used for further extraction, but if we extracted everything here, we might just return.
          }

          if (g.episode) {
            episodeMatch = { value: g.episode, raw: g.episode, index: -1 } // details approximate
          }
          if (g.season) {
            seasonMatch = { value: g.season, raw: g.season, index: -1 }
          }
          if (g.episodeTitle) {
            episodeTitle = g.episodeTitle
          }

          // Special Case: If "title" group exists, that IS the search title.
          if (g.title) {
            return this.consolidate(
              g.title,
              seasonMatch,
              episodeMatch,
              episodeTitle
            )
          }
        }
      }
    }

    // --- STRATEGY A: Explicit Fields (High Confidence) ---
    if (rawSeason) {
      const match = this.extractField(
        rawSeason.value,
        rawSeason.regex,
        'season'
      )
      if (match) seasonMatch = match
    }
    if (rawEpisode) {
      const match = this.extractField(
        rawEpisode.value,
        rawEpisode.regex,
        'episode'
      )
      if (match) episodeMatch = match
    }

    // Episode Title (Explicit)
    // Note: extractField is designed for season/episode (numeric mostly).
    // For episodeTitle, we just want the string value, optionally applying regex.
    if (rawEpisodeTitle) {
      // If regex exists, use it to match
      if (rawEpisodeTitle.regex.length > 0) {
        const match = RegexUtils.runUserRegex(
          rawEpisodeTitle.value,
          rawEpisodeTitle.regex
        )
        if (match) {
          episodeTitle = match.value.toString()
        }
      } else {
        // No regex, just use value
        episodeTitle = rawEpisodeTitle.value
      }
    }

    // --- STRATEGY B: Title Fallback (Lower Confidence) ---
    // If we missed fields, look inside the title
    if (!seasonMatch) {
      seasonMatch = this.extractField(
        cleanTitleText,
        rawSeason?.regex ?? [],
        'season'
      )
    }

    // For episode, we extract from title ONLY if we didn't find it in a dedicated element
    if (!episodeMatch) {
      episodeMatch = this.extractField(
        cleanTitleText,
        rawEpisode?.regex ?? [],
        'episode'
      )
    }

    // 4. Consolidation & Cleaning
    return this.consolidate(
      cleanTitleText,
      seasonMatch,
      episodeMatch,
      episodeTitle
    )
  }

  private extractField(
    text: string,
    userRegex: string[],
    type: 'season' | 'episode'
  ): ExtractorMatch | null {
    // 1. Try User Regex
    if (userRegex.length > 0) {
      const match = RegexUtils.runUserRegex(text, userRegex)
      if (match) {
        return match
      }
    }

    // 2. Try Common Patterns (Heuristics)
    return type === 'season'
      ? RegexUtils.findCommonSeason(text)
      : RegexUtils.findCommonEpisode(text)
  }

  private consolidate(
    originalTitle: string,
    season: ExtractorMatch | null,
    episode: ExtractorMatch | null,
    episodeTitle?: string
  ): MediaInfoParseResult {
    let searchTitle = originalTitle
    let finalSeason: number | undefined
    let finalEpisode = 1

    // Logic: If the episode was found INSIDE the title, we usually want to remove it
    // to create a broader search query.
    // Example: "Horizon S01E05" -> Remove "E05" -> Search "Horizon S01"

    if (episode) {
      const numericEpisode = convertToNumber(episode.value)
      if (numericEpisode !== null) {
        finalEpisode = numericEpisode
        // If the match came from the title string, strip it for the search query
        if (originalTitle.includes(episode.raw)) {
          // Be careful not to strip "S1" if it was part of "S1E1" match group
          // This is a simplified stripper; real-world needs token checks
          searchTitle = searchTitle.replace(episode.raw, '').trim()
        }
      }
    }

    if (season) {
      finalSeason =
        typeof season.value === 'number'
          ? season.value
          : chineseToNumber(season.value)!

      // Intelligent Merging: Ensure Season IS in the search title
      // If title is "Show Name" and season is "S2", search title becomes "Show Name S2"
      // If title is "Show Name S2", we don't add it again.

      const seasonIdentifier = season.raw.trim()
      if (!searchTitle.includes(seasonIdentifier)) {
        searchTitle = `${searchTitle} ${seasonIdentifier}`
      }
    }

    // Cleanup: Remove double spaces or trailing punctuation left by removal
    searchTitle = searchTitle.replace(/\s+/g, ' ').trim()

    return {
      searchTitle,
      originalTitle: originalTitle,
      episode: finalEpisode,
      season: finalSeason,
      episodeTitle,
    }
  }
}
