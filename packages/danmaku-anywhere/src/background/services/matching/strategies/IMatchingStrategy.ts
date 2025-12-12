import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import type { MatchingStrategyType } from '@/common/anime/MatchingStrategyType'

export interface IMatchingStrategy {
  name: MatchingStrategyType
  /**
   * Attempts to match an episode.
   * Returns a Result if this strategy handled the request (success or terminal failure).
   * Returns null to pass to the next strategy.
   */
  match(input: MatchEpisodeInput): Promise<MatchEpisodeResult | null>
}
