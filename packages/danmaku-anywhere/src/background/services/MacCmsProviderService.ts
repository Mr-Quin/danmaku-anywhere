import type { CustomSeason } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import {
  fetchDanmuIcuComments,
  searchMacCmsVod,
} from '@danmaku-anywhere/danmaku-provider/maccms'
import { Logger } from '@/common/Logger'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { DanmakuService } from './DanmakuService'
import type { IDanmakuProvider } from './providers/IDanmakuProvider'
import type { SeasonSearchParams } from '@/common/anime/dto'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import type {
  Episode,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'

export class MacCmsProviderService implements IDanmakuProvider {
  private logger: typeof Logger

  constructor(private danmakuService: DanmakuService) {
    invariant(
      isServiceWorker(),
      'MacCmsProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[MacCmsProviderService]')
  }

  async search(
    params: SeasonSearchParams | string,
    config?: ProviderConfig | string
  ): Promise<CustomSeason[]> {
    // Legacy support for direct call
    if (typeof params === 'string' && typeof config === 'string') {
      return this.searchInternal(config, params)
    }

    if (typeof params === 'object' && config && typeof config === 'object') {
      assertProviderConfigImpl(config, DanmakuSourceType.MacCMS)
      return this.searchInternal(config.options.danmakuBaseUrl, params.keyword)
    }

    throw new Error('Invalid arguments for MacCMS search')
  }

  private async searchInternal(
    baseUrl: string,
    keyword: string
  ): Promise<CustomSeason[]> {
    this.logger.debug('Searching for', {
      baseUrl,
      keyword,
    })
    const res = await searchMacCmsVod(baseUrl, keyword)

    return res.list.map((item, i) => {
      const id = `custom:${item.vod_id}:${i}`
      return {
        id: i,
        version: 1,
        timeUpdated: 0,
        indexedId: id,
        title: item.vod_name,
        type: 'Custom',
        imageUrl: item.vod_pic ?? undefined,
        externalLink: undefined,
        localEpisodeCount: undefined,
        year: item.vod_year
          ? Number.parseInt(item.vod_year) || undefined
          : undefined,
        schemaVersion: 1,
        provider: DanmakuSourceType.MacCMS,
        providerIds: {},
        episodes: item.parsedPlayUrls,
      }
    })
  }

  async fetchDanmakuForUrl(
    title: string,
    url: string,
    providerConfigId: string
  ) {
    const config = await providerConfigService.get(providerConfigId)
    if (!config) {
      throw new Error(
        `Provider config with ID "${providerConfigId}" not found. Please ensure the provider configuration exists.`
      )
    }
    if (config.type !== 'MacCMS') {
      throw new Error(
        `Invalid provider type "${config.type}" for MacCMS service. Expected "MacCMS".`
      )
    }

    const comments = await fetchDanmuIcuComments(
      config.options.danmuicuBaseUrl,
      url,
      config.options.stripColor
    )
    return this.danmakuService.importCustom({ title, comments })
  }

  async getEpisodes(
    _seasonId: number,
    _config: ProviderConfig
  ): Promise<WithSeason<EpisodeMeta>[]> {
    throw new Error('Method not implemented.')
  }

  async getDanmaku(
    _request: DanmakuFetchRequest,
    _config: ProviderConfig
  ): Promise<WithSeason<Episode>> {
    throw new Error('Method not implemented.')
  }
}
