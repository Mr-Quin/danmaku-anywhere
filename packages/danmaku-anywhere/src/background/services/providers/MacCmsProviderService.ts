import {
  type CustomSeason,
  LEGACY_MACCMS_ID,
} from '@danmaku-anywhere/danmaku-converter'
import {
  fetchDanmuIcuComments,
  searchMacCmsVod,
} from '@danmaku-anywhere/danmaku-provider/maccms'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { type ErrorTarget, sourceTarget } from '@/common/errors/AppError'
import type { ILogger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  isLegacyMacCms,
  toSourceRef,
} from '@/common/options/providerConfig/utils'
import {
  LEGACY_MACCMS_CAPABILITIES,
  type SourceStatus,
} from '@/common/providers/sourceCapabilities'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { SearchOnlyProvider, SeasonSearchParams } from './IDanmakuProvider'
import { fromProviderApiError } from './providerErrors'

export class MacCmsProviderService implements SearchOnlyProvider {
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

  readonly kind = 'searchOnly'

  async getStatus(): Promise<SourceStatus> {
    return { status: 'available', capabilities: LEGACY_MACCMS_CAPABILITIES }
  }

  async search(params: SeasonSearchParams): Promise<CustomSeason[]> {
    return MacCmsProviderService.search(
      this.configValues.danmakuBaseUrl,
      params.keyword,
      this.logger,
      sourceTarget(toSourceRef(this.config))
    )
  }

  static async search(
    baseUrl: string,
    keyword: string,
    logger: ILogger,
    target?: ErrorTarget
  ): Promise<CustomSeason[]> {
    logger.debug('Searching for', {
      baseUrl,
      keyword,
    })
    const res = await searchMacCmsVod(baseUrl, keyword)

    if (!res.success) {
      throw fromProviderApiError(res.error, target)
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
      throw fromProviderApiError(
        commentsResult.error,
        sourceTarget(toSourceRef(config))
      )
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
