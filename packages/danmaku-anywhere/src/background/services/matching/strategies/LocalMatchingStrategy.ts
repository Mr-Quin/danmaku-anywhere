import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { renderLocalMatchingPattern } from '@/common/options/localMatchingRule/schema'
import { LocalMatchingRuleService } from '@/common/options/localMatchingRule/service'
import type { IMatchingStrategy } from './IMatchingStrategy'

@injectable()
export class LocalMatchingStrategy implements IMatchingStrategy {
  readonly name = 'local'

  constructor(
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuService) private danmakuService: DanmakuService,
    @inject(LocalMatchingRuleService)
    private localMatchingRuleService: LocalMatchingRuleService
  ) {}

  async match(input: MatchEpisodeInput): Promise<MatchEpisodeResult | null> {
    const options = await this.extensionOptionsService.get()

    if (!options.matchLocalDanmaku) {
      return null
    }

    // 1. Try rule-based matching first
    const ruleMatch = await this.matchByRule(input)
    if (ruleMatch) {
      return ruleMatch
    }

    // 2. Fall back to filename matching
    // prefer original title if available
    const customEpisode = await this.danmakuService.matchLocalByTitle(
      input.originalTitle ?? input.title
    )

    if (customEpisode) {
      return {
        status: 'success',
        data: customEpisode,
        metadata: { strategy: 'local' },
      }
    }
    return null
  }

  private async matchByRule(
    input: MatchEpisodeInput
  ): Promise<MatchEpisodeResult | null> {
    if (input.episodeNumber === undefined) {
      return null
    }

    const rule = await this.localMatchingRuleService.getRuleByMapKey(
      input.mapKey
    )
    if (!rule) {
      return null
    }

    const renderedTitle = renderLocalMatchingPattern(
      rule.pattern,
      input.episodeNumber
    )
    const customEpisode =
      await this.danmakuService.getCustomByTitle(renderedTitle)

    if (customEpisode) {
      return {
        status: 'success',
        data: customEpisode,
        metadata: { strategy: 'local' },
      }
    }
    return null
  }
}
