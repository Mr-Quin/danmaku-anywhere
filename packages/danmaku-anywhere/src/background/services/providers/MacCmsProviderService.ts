import {
  type CommentEntity,
  type CustomSeason,
  type EpisodeMeta,
  LEGACY_MACCMS_ID,
  type SeasonInsert,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import {
  fetchDanmuIcuComments,
  searchMacCmsVod,
} from '@danmaku-anywhere/danmaku-provider/maccms'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { ILogger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import {
  LEGACY_MACCMS_CAPABILITIES,
  type SourceCapabilities,
} from '@/common/providers/sourceCapabilities'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
} from './IDanmakuProvider'

function searchOnly(): never {
  throw new Error('MacCMS sources only support search')
}

export class MacCmsProviderService implements IDanmakuProvider {
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

  async getCapabilities(): Promise<SourceCapabilities> {
    return LEGACY_MACCMS_CAPABILITIES
  }

  async getSeason(): Promise<SeasonInsert | null> {
    return searchOnly()
  }

  async getEpisodes(): Promise<OmitSeasonId<EpisodeMeta>[]> {
    return searchOnly()
  }

  async getDanmaku(): Promise<CommentEntity[]> {
    return searchOnly()
  }

  async findEpisode(): Promise<WithSeason<EpisodeMeta> | null> {
    return searchOnly()
  }

  async canParse(): Promise<boolean> {
    return false
  }

  async parseUrl(): Promise<ParseUrlResult | null> {
    return searchOnly()
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
        isCustom: true as const,
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
    if (!isLegacyMacCms(config)) {
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
}

interface MacCmsConfigValues {
  danmakuBaseUrl: string
  danmuicuBaseUrl: string
  stripColor: boolean
}
