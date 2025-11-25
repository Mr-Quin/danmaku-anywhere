import type {
  CommentEntity,
  CustomSeason,
  EpisodeMeta,
} from '@danmaku-anywhere/danmaku-converter'
import {
  fetchDanmuIcuComments,
  searchMacCmsVod,
} from '@danmaku-anywhere/danmaku-provider/maccms'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'
import type { CustomMacCmsProvider } from '@/common/options/providerConfig/schema'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { DanmakuService } from '../persistence/DanmakuService'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  SeasonSearchParams,
} from './IDanmakuProvider'

const logger = Logger.sub('[MacCmsProviderService]')

export class MacCmsProviderService implements IDanmakuProvider {
  readonly forProvider = DanmakuSourceType.MacCMS

  constructor(private config: CustomMacCmsProvider) {
    invariant(
      isServiceWorker(),
      'MacCmsProviderService is only available in service worker'
    )
  }

  async search(params: SeasonSearchParams): Promise<CustomSeason[]> {
    return MacCmsProviderService.search(
      this.config.options.danmakuBaseUrl,
      params.keyword
    )
  }

  static async search(
    baseUrl: string,
    keyword: string
  ): Promise<CustomSeason[]> {
    logger.debug('Searching for', {
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

  static async fetchDanmakuForUrl(
    title: string,
    url: string,
    providerConfigId: string,
    danmakuService: DanmakuService
  ) {
    // TODO: Use the config from the instance
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

    return danmakuService.importCustom({ title, comments })
  }

  async getEpisodes(
    _providerIds: unknown
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    throw new Error('Method not implemented.')
  }

  async getDanmaku(_request: DanmakuFetchRequest): Promise<CommentEntity[]> {
    throw new Error('Method not implemented.')
  }
}
