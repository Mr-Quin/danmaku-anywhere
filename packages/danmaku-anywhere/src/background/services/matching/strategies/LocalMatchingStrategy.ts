import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { NamingRule } from '@/common/options/localMatchingRule/schema'
import { renderNamingPattern } from '@/common/options/localMatchingRule/schema'
import { NamingRuleService } from '@/common/options/localMatchingRule/service'
import type { IMatchingStrategy } from './IMatchingStrategy'

@injectable()
export class LocalMatchingStrategy implements IMatchingStrategy {
  readonly name = 'local'
  private logger: ILogger

  constructor(
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuService) private danmakuService: DanmakuService,
    @inject(NamingRuleService)
    private namingRuleService: NamingRuleService,
    @inject(TitleMappingService)
    private titleMappingService: TitleMappingService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[LocalMatchingStrategy]')
  }

  async match(input: MatchEpisodeInput): Promise<MatchEpisodeResult | null> {
    const options = await this.extensionOptionsService.get()
    if (!options.matchLocalDanmaku) {
      return null
    }

    // Try rule-based matching (title-based, then mapping-assisted)
    if (input.episodeNumber !== undefined) {
      const ep = input.episodeNumber
      const { rules } = await this.namingRuleService.get()

      const ruleMatch =
        (await this.matchByTitle(input, ep, rules)) ??
        (await this.matchByMapping(input.mapKey, ep, rules))

      if (ruleMatch) {
        return ruleMatch
      }
    }

    // Fall back to fuzzy filename matching
    const title = input.originalTitle ?? input.title
    const customEpisode = await this.danmakuService.matchLocalByTitle(title)

    if (customEpisode) {
      return {
        status: 'success',
        data: customEpisode,
        metadata: { strategy: 'local' },
      }
    }

    return null
  }

  private async matchByTitle(
    input: MatchEpisodeInput,
    episodeNumber: number,
    rules: NamingRule[]
  ): Promise<MatchEpisodeResult | null> {
    const titles = [input.title]
    if (input.originalTitle) {
      titles.push(input.originalTitle)
    }

    for (const title of titles) {
      const rule = rules.find((r) => r.title === title)
      if (rule) {
        return this.matchWithRule(rule, episodeNumber)
      }
    }
    return null
  }

  private async matchByMapping(
    mapKey: string,
    episodeNumber: number,
    rules: NamingRule[]
  ): Promise<MatchEpisodeResult | null> {
    const mapping = await this.titleMappingService.get(mapKey)
    if (!mapping?.local) {
      return null
    }

    const rule = rules.find((r) => r.folderPath === mapping.local)
    if (!rule) {
      this.logger.debug('Naming rule not found for mapped folder', {
        folderPath: mapping.local,
      })
      return null
    }

    return this.matchWithRule(rule, episodeNumber)
  }

  private async matchWithRule(
    rule: { folderPath: string; pattern: string },
    episodeNumber: number
  ): Promise<MatchEpisodeResult | null> {
    const renderedFilename = renderNamingPattern(rule.pattern, episodeNumber)
    const fullPath = `${rule.folderPath}/${renderedFilename}`
    const customEpisode = await this.danmakuService.getCustomByTitle(fullPath)

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
