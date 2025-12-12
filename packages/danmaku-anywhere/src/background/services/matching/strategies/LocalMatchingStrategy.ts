import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import {
  type ExtensionOptionsService,
  extensionOptionsServiceSymbol,
} from '@/common/options/extensionOptions/service'
import { stripExtension } from '@/common/utils/stripExtension'
import type { IMatchingStrategy } from './IMatchingStrategy'

@injectable()
export class LocalMatchingStrategy implements IMatchingStrategy {
  readonly name = 'local'

  constructor(
    @inject(extensionOptionsServiceSymbol)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuService) private danmakuService: DanmakuService
  ) {}

  async match(input: MatchEpisodeInput): Promise<MatchEpisodeResult | null> {
    const options = await this.extensionOptionsService.get()

    if (!options.matchLocalDanmaku) {
      return null
    }

    const customEpisode = await this.danmakuService.matchLocalByTitle(
      stripExtension(input.title)
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
}
