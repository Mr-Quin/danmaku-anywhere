import {
  type CommentEntity,
  type CustomSeason,
  type EpisodeMeta,
  LEGACY_MACCMS_ID,
} from '@danmaku-anywhere/danmaku-converter'
import {
  fetchDanmuIcuComments,
  searchMacCmsVod,
} from '@danmaku-anywhere/danmaku-provider/maccms'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ILogger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  SeasonSearchParams,
} from './IDanmakuProvider'

export class MacCmsProviderService implements IDanmakuProvider {
  readonly forProvider = DanmakuSourceType.MacCMS
  private logger: ILogger

  constructor(
    private config: ProviderConfig,
    logger: ILogger
  ) {
    this.logger = logger.sub('[MacCmsProviderService]')
    invariant(
      isServiceWorker(),
      'MacCmsProviderService is only available in service worker'
    )
  }

  private get configValues(): MacCmsConfigValues {
    return this.config.configValues as unknown as MacCmsConfigValues
  }

  async search(params: SeasonSearchParams): Promise<CustomSeason[]> {
    return MacCmsProviderService.search(
      this.configValues.danmakuBaseUrl,
      params.keyword,
      this.logger
    )
  }

  static async search(
    baseUrl: string,
    keyword: string,
    logger: ILogger
  ): Promise<CustomSeason[]> {
    logger.debug('Searching for', {
      baseUrl,
      keyword,
    })
    const res = await searchMacCmsVod(baseUrl, keyword)

    if (!res.success) {
      throw res.error
    }

    return res.data.list.map((item, i) => {
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
    danmakuService: DanmakuService,
    providerConfigService: ProviderConfigService
  ) {
    // TODO: Use the config from the instance
    const config = await providerConfigService.get(providerConfigId)
    if (!config) {
      throw new Error(
        `Provider config with ID "${providerConfigId}" not found. Please ensure the provider configuration exists.`
      )
    }
    if (config.manifestId !== LEGACY_MACCMS_ID) {
      throw new Error(
        `Invalid provider manifest "${config.manifestId}" for MacCMS service. Expected ${LEGACY_MACCMS_ID}.`
      )
    }

    const values = config.configValues as unknown as MacCmsConfigValues
    const commentsResult = await fetchDanmuIcuComments(
      values.danmuicuBaseUrl,
      url,
      values.stripColor
    )

    if (!commentsResult.success) {
      throw commentsResult.error
    }

    const comments = commentsResult.data

    return danmakuService.importCustom({ title, comments })
  }

  async getEpisodes(
    _providerIds: unknown
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    throw new Error('Method not implemented.')
  }

  async getDanmaku(_request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    throw new Error('Method not implemented.')
  }
}

interface MacCmsConfigValues {
  danmakuBaseUrl: string
  danmuicuBaseUrl: string
  stripColor: boolean
}
