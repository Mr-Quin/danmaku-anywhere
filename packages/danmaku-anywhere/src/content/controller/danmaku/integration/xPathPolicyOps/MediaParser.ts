import { chineseToNumber } from './chineseToNumber'
import { mediaRegexMatcher } from './mediaRegexMatcher'
import type { ExtractorMatch, MediaInfoParseResult } from './types'

interface ParserInputField {
  value: string
  regex: string[]
}

export interface MediaParserInput {
  title: ParserInputField
  season?: ParserInputField | null
  episode?: ParserInputField | null
  episodeTitle?: ParserInputField | null
}

class ParsingContext {
  searchTitle: string
  originalTitle: string

  result: {
    season?: string
    episode?: number
    episodeTitle?: string
  } = {}

  episodeMatchIndex: number | null = null

  constructor(originalTitle: string) {
    this.originalTitle = originalTitle
    this.searchTitle = this.originalTitle
  }

  public appendSeason(seasonId: string) {
    const numericSeason = chineseToNumber(seasonId)
    if (numericSeason !== null) {
      // season is numeric
      if (!this.searchTitle.includes(`S${numericSeason}`)) {
        this.searchTitle = `${this.searchTitle} S${numericSeason}`
      }
    } else {
      const trimmedSeasonId = seasonId.trim()
      if (!this.searchTitle.includes(trimmedSeasonId)) {
        this.searchTitle = `${this.searchTitle} ${trimmedSeasonId}`
      }
    }
  }
}

function coerceToNumber(val: string | number): number {
  if (typeof val === 'number') {
    return val
  }
  return chineseToNumber(val) ?? Number.parseInt(val, 10)
}

export class MediaParser {
  public parse(input: MediaParserInput): MediaInfoParseResult {
    const context = new ParsingContext(input.title.value)

    // Try parsing using regex with named groups
    if (this.tryApplyNamedGroups(context, input.title.regex)) {
      return this.finalize(context)
    }

    // Try parsing each field explicitly
    if (input.season) {
      const match = this.extractField(
        input.season.value,
        input.season.regex,
        'season'
      )

      context.result.season = match
        ? match.value.toString()
        : input.season.value
    }

    if (input.episode) {
      const match = this.extractField(
        input.episode.value,
        input.episode.regex,
        'episode'
      )
      if (match) {
        context.result.episode = coerceToNumber(match.value)
      } else {
        const numericEpisode = chineseToNumber(input.episode.value)
        if (numericEpisode) {
          context.result.episode = numericEpisode
        }
      }
    }

    if (input.episodeTitle) {
      context.result.episodeTitle = input.episodeTitle.value
    }

    this.scanTitleForMissingInfo(context, input)

    this.rebuildSearchTitle(context)

    return this.finalize(context)
  }

  private tryApplyNamedGroups(ctx: ParsingContext, regexes: string[]): boolean {
    if (!regexes || regexes.length === 0) return false

    const match = mediaRegexMatcher.runUserRegex(ctx.originalTitle, regexes)

    if (match && match.groups) {
      const g = match.groups

      if (g.title) {
        ctx.searchTitle = g.title.trim()

        if (g.season) {
          ctx.result.season = g.season
        }
        if (g.episode) {
          ctx.result.episode = coerceToNumber(g.episode)
        }
        if (g.episodeTitle) {
          ctx.result.episodeTitle = g.episodeTitle.trim()
        }

        if (ctx.result.season) {
          ctx.appendSeason(ctx.result.season)
        }

        return true
      }
    }

    return false
  }

  private scanTitleForMissingInfo(
    ctx: ParsingContext,
    input: MediaParserInput
  ) {
    // Look for episode
    if (ctx.result.episode === undefined) {
      const match = this.extractField(
        ctx.originalTitle,
        input.episode?.regex ?? [],
        'episode'
      )
      if (match) {
        ctx.result.episode = coerceToNumber(match.value)
        ctx.episodeMatchIndex = match.index

        // Check if the match contains a season identifier
        const combinedSeasonMatch = match.raw.match(
          /^(S\d+|Season\s?\d+|第.+季)/i
        )
        if (combinedSeasonMatch && !ctx.result.season) {
          ctx.result.season = combinedSeasonMatch[0]
        }
      }
    }

    // Look for season if missing
    if (ctx.result.season === undefined) {
      const match = this.extractField(
        ctx.originalTitle,
        input.season?.regex ?? [],
        'season'
      )
      console.log('Looking for season', ctx.originalTitle)
      if (match) {
        console.log('Found season', match)
        ctx.result.season = match.raw
      }
    }
  }

  private rebuildSearchTitle(ctx: ParsingContext) {
    // Truncate the title at the episode match index
    if (ctx.episodeMatchIndex !== null && ctx.episodeMatchIndex >= 0) {
      ctx.searchTitle = ctx.originalTitle
        .substring(0, ctx.episodeMatchIndex)
        .trim()

      if (ctx.result.season) {
        ctx.appendSeason(ctx.result.season)
      }
    }
    // If no episode found in title, probably non-episode media
    else if (ctx.result.season) {
      ctx.appendSeason(ctx.result.season)
    }

    // Remove double spaces
    ctx.searchTitle = ctx.searchTitle.replace(/\s+/g, ' ').trim()
  }

  private extractField(
    text: string,
    userRegex: string[],
    type: 'season' | 'episode'
  ): ExtractorMatch | null {
    if (userRegex.length > 0) {
      const match = mediaRegexMatcher.runUserRegex(text, userRegex)
      if (match) {
        return match
      }
    }

    return type === 'season'
      ? mediaRegexMatcher.findCommonSeason(text)
      : mediaRegexMatcher.findCommonEpisode(text)
  }

  private finalize(ctx: ParsingContext): MediaInfoParseResult {
    return {
      searchTitle: ctx.searchTitle,
      originalTitle: ctx.originalTitle,
      episode: ctx.result.episode,
      episodeTitle: ctx.result.episodeTitle,
    }
  }
}
