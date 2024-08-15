import { match } from 'ts-pattern'

import { BilibiliService } from '@/background/services/BilibiliService'
import { DanDanPlayService } from '@/background/services/DanDanPlayService'
import type { GetEpisodeDto, MediaSearchParams } from '@/common/anime/dto'
import { DanmakuProviderType } from '@/common/anime/enums'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class ProviderService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService
  private bilibiliService = new BilibiliService()
  private danDanPlayService = new DanDanPlayService()

  constructor() {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  async searchByProvider(
    provider: DanmakuProviderType,
    searchParams: MediaSearchParams
  ) {
    this.logger.debug('Searching by provider', provider, searchParams)

    const data = await match(provider)
      .with(DanmakuProviderType.DanDanPlay, async (provider) => {
        const data = await this.danDanPlayService.search({
          anime: searchParams.keyword,
          episode: searchParams.episode,
        })
        return {
          provider,
          data,
        }
      })
      .with(DanmakuProviderType.Bilibili, async (provider) => {
        const data = await this.bilibiliService.search({
          keyword: searchParams.keyword,
        })
        return {
          provider,
          data,
        }
      })
      .otherwise(() => {
        throw new Error('Provider not supported')
      })

    return data
  }

  async searchByProviders(
    searchParams: MediaSearchParams,
    providers: DanmakuProviderType[]
  ) {
    const searchPromises = providers.map(async (provider) => {
      return this.searchByProvider(provider, searchParams)
    })

    return Promise.all(searchPromises)
  }

  async getEpisodes(data: GetEpisodeDto) {
    if (data.provider === DanmakuProviderType.Bilibili) {
      return this.bilibiliService.getBangumiInfo(data.seasonId)
    }
    throw new Error('Provider not supported')
  }
}
