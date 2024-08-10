import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import { match } from 'ts-pattern'

import type { MediaSearchParams } from '@/common/anime/dto'
import { DanmakuProviderType } from '@/common/anime/enums'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class ProviderService {
  constructor() {
    invariant(isServiceWorker(), 'Provider is only available in service worker')
  }

  async searchDanDanPlay(searchParams: DanDanAnimeSearchAPIParams) {
    return danDanPlay.searchAnime(searchParams)
  }

  async searchBilibili(searchParams: BiliBiliSearchParams) {
    return bilibili.searchMedia(searchParams)
  }

  private async searchByProvider(
    provider: DanmakuProviderType,
    searchParams: MediaSearchParams
  ) {
    const data = await match(provider)
      .with(DanmakuProviderType.DanDanPlay, async (provider) => {
        const data = await this.searchDanDanPlay({
          anime: searchParams.keyword,
        })
        return {
          provider,
          data,
        }
      })
      .with(DanmakuProviderType.Bilibili, async (provider) => {
        const data = await this.searchBilibili({
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

  async getBiliBiliEpisodes(mediaId: number) {
    return bilibili.getBangumiInfo(mediaId)
  }
}
