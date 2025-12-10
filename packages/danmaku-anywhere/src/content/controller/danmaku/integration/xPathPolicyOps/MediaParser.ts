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
}

export class MediaParser {
  public parse(input: MediaParserInput): MediaInfoParseResult {
    // 1. Gather Candidates
    const rawTitle = input.title
    const rawSeason = input.season
    const rawEpisode = input.episode

    // 2. Normalize (Optional but recommended for robust UX)
    // Converts full-width chars (１２３) to half-width (123), removes zero-width spaces
    const cleanTitleText = normalizeText(rawTitle.value)

    // 3. Extraction Pipeline
    let seasonMatch: ExtractorMatch | null = null
    let episodeMatch: ExtractorMatch | null = null

    // --- STRATEGY A: Explicit Fields (High Confidence) ---
    if (rawSeason) {
      seasonMatch = this.extractField(
        rawSeason.value,
        rawSeason.regex,
        'season'
      )
    }
    if (rawEpisode) {
      episodeMatch = this.extractField(
        rawEpisode.value,
        rawEpisode.regex,
        'episode'
      )
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
    return this.consolidate(cleanTitleText, seasonMatch, episodeMatch)
  }

  private extractField(
    text: string,
    userRegex: string[],
    type: 'season' | 'episode'
  ): ExtractorMatch | null {
    // 1. Try User Regex
    if (userRegex && userRegex.length > 0) {
      const match = RegexUtils.runUserRegex(text, userRegex)
      if (match) return match
    }

    // 2. Try Common Patterns (Heuristics)
    return type === 'season'
      ? RegexUtils.findCommonSeason(text)
      : RegexUtils.findCommonEpisode(text)
  }

  private consolidate(
    originalTitle: string,
    season: ExtractorMatch | null,
    episode: ExtractorMatch | null
  ): MediaInfoParseResult {
    let searchTitle = originalTitle
    let finalSeason: number | undefined
    let finalEpisode = 1

    // Logic: If the episode was found INSIDE the title, we usually want to remove it
    // to create a broader search query.
    // Example: "Horizon S01E05" -> Remove "E05" -> Search "Horizon S01"

    if (episode) {
      finalEpisode =
        typeof episode.value === 'number'
          ? episode.value
          : Number.parseInt(episode.value as string, 10)

      // If the match came from the title string, strip it for the search query
      if (originalTitle.includes(episode.raw)) {
        // Be careful not to strip "S1" if it was part of "S1E1" match group
        // This is a simplified stripper; real-world needs token checks
        searchTitle = searchTitle.replace(episode.raw, '').trim()
      }
    }

    if (season) {
      finalSeason =
        typeof season.value === 'number'
          ? season.value
          : Number.parseInt(season.value as string, 10)

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
      displayTitle: originalTitle,
      episode: finalEpisode,
      season: finalSeason,
    }
  }
}
