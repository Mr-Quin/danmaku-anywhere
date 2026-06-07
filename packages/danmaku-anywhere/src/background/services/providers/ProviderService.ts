import type {
  CustomSeason,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { alarmKeys } from '@/common/alarms/constants'
import type { SeasonQueryFilter, SeasonSearchRequest } from '@/common/anime/dto'
import type {
  DanmakuFetchByMeta,
  DanmakuFetchRequest,
} from '@/common/danmaku/dto'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import type {
  ProviderLoginStatus,
  ProviderManifestList,
  ProviderManifestSpec,
} from '@/common/rpcClient/background/types'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { OmitSeasonId } from './IDanmakuProvider'
import { ManifestRegistry } from './ManifestRegistry'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

function enrichEpisode(
  episode: OmitSeasonId<EpisodeMeta>,
  season: Season
): WithSeason<EpisodeMeta> {
  return {
    ...episode,
    seasonId: season.id,
    season,
  }
}

@injectable('Singleton')
export class ProviderService {
  private readonly logger: ILogger

  constructor(
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory,
    @inject(ManifestRegistry)
    private manifestRegistry: ManifestRegistry,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = logger.sub('[ProviderService]')
  }

  async searchSeason(
    params: SeasonSearchRequest
  ): Promise<(Season | SeasonInsert)[] | CustomSeason[]> {
    await this.manifestRegistry.ready
    const providerConfig = await this.providerConfigService.mustGet(
      params.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)

    const seasonInserts = await service.search(params)
    // TODO: fix this once we fold custom seasons into the season insert
    if (providerConfig.manifestId === LEGACY_MACCMS_ID) {
      return seasonInserts as CustomSeason[]
    }
    // Surface existing ids so bookmark / cache indicators still resolve.
    const inserts = seasonInserts as SeasonInsert[]
    return Promise.all(
      inserts.map(async (insert) => {
        const existing = await this.seasonService.findExisting(insert)
        return existing ?? insert
      })
    )
  }

  async upsertSeason(data: SeasonInsert): Promise<Season> {
    return this.seasonService.upsert(data)
  }

  async fetchEpisodesBySeason(
    seasonId: number
  ): Promise<WithSeason<EpisodeMeta>[]> {
    await this.manifestRegistry.ready
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )

    if (providerConfig.manifestId === LEGACY_MACCMS_ID) {
      throw new Error('MacCMS does not support fetching episodes')
    }

    const service = this.danmakuProviderFactory(providerConfig)
    const episodes = await service.getEpisodes(season.providerIds)
    return episodes.map((episode) => enrichEpisode(episode, season))
  }

  async refreshSeason(filter: SeasonQueryFilter) {
    await this.manifestRegistry.ready
    const [season] = await this.seasonService.filter(filter)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)
    if (!service.getSeason) {
      return
    }
    const seasonInsert = await service.getSeason(season.providerIds)
    if (seasonInsert) {
      await this.seasonService.upsert(seasonInsert)
    } else {
      throw new Error(`Season refresh failed: ${season.title}`, {
        cause: season,
      })
    }
  }

  private async resolveMeta(
    request: DanmakuFetchRequest
  ): Promise<DanmakuFetchByMeta> {
    if (request.type === 'by-meta') {
      return request
    }
    const season = await this.seasonService.mustGetById(request.seasonId)
    const meta = enrichEpisode(
      {
        ...request.stub,
        schemaVersion: 4 as const,
        lastChecked: 0,
      },
      season
    )
    return { type: 'by-meta', meta, options: request.options }
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<WithSeason<Episode>> {
    await this.manifestRegistry.ready
    const resolved = await this.resolveMeta(request)
    const { options = {}, meta } = resolved
    const provider = meta.provider

    const [existingDanmaku] = await this.danmakuService.filter({
      provider,
      indexedId: meta.indexedId,
      seasonId: meta.seasonId,
    })

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      return existingDanmaku
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const config = await this.providerConfigService.mustGet(
      meta.season.providerConfigId
    )

    if (config.manifestId === LEGACY_MACCMS_ID) {
      throw new Error('MacCMS episodes are not refetchable')
    }

    const service = this.danmakuProviderFactory(config)

    const comments = await service.getDanmaku(resolved)

    const { season, ...rest } = meta

    const saved = await this.danmakuService.upsert({
      ...rest,
      seasonId: season.id,
      comments,
      commentCount: comments.length,
    })

    return {
      ...saved,
      season,
    }
  }

  async parseUrl(url: string): Promise<WithSeason<EpisodeMeta>> {
    // URL parsing is independent of provider enablement: the popup feeds
    // any pasted URL regardless of which sources the user has toggled on.
    // Disabling Bilibili would otherwise make a recognized bilibili.com
    // URL fail with "No provider found".
    await this.manifestRegistry.ready
    const configs = await this.providerConfigService.getAll()
    for (const config of configs) {
      const service = this.danmakuProviderFactory(config)
      if (!service.canParse?.(url)) {
        continue
      }
      if (!service.parseUrl) {
        continue
      }
      const result = await service.parseUrl(url)
      if (result) {
        const { episodeMeta, seasonInsert } = result
        const season = await this.seasonService.upsert(seasonInsert)
        return enrichEpisode(episodeMeta, season)
      }
    }

    throw new Error('No provider found capable of parsing URL')
  }

  async probeLogin<T = unknown>(manifestId: string): Promise<T | null> {
    await this.manifestRegistry.ready
    return this.manifestRegistry.getRunner(manifestId).runLoginProbe<T>()
  }

  // Resolves whether a manifest-driven source needs a login/cookie action so
  // the popup can render the warning without source-specific switches. A
  // source without a loginProbe is always considered ok.
  async getLoginStatus(manifestId: string): Promise<ProviderLoginStatus> {
    let spec: ProviderManifestSpec
    try {
      spec = await this.getManifestSpec(manifestId)
    } catch {
      // No manifest registered for this id (e.g. legacy:maccms): nothing to
      // probe, so report ok rather than rejecting the RPC.
      return { hasLoginProbe: false, ok: true }
    }
    const { hasLoginProbe, cookieSet } = spec
    if (!hasLoginProbe) {
      return { hasLoginProbe: false, cookieSet, ok: true }
    }
    try {
      const ok = await this.probeLogin<boolean>(manifestId)
      return { hasLoginProbe: true, cookieSet, ok: ok ?? false }
    } catch (e) {
      this.logger.error('loginProbe failed', manifestId, e)
      return { hasLoginProbe: true, cookieSet, ok: false }
    }
  }

  // Lists every registered manifest plus the last catalog-check timestamp so
  // the popup can render the catalog section (registered manifests the user
  // has no config for) without bundling the manifest set itself.
  async listManifests(): Promise<ProviderManifestList> {
    await this.manifestRegistry.ready
    return {
      manifests: this.manifestRegistry.listManifests(),
      lastCheckedAt: await this.manifestRegistry.getLastCheckedAt(),
    }
  }

  // Register the install seed + periodic catalog refresh. Kept here (not in the
  // registry) because bringing the catalog current needs the installed set.
  setup(): void {
    chrome.runtime.onInstalled.addListener(() => {
      this.syncCatalog().catch((e) => {
        this.logger.error('Catalog sync failed:', e)
      })
    })

    void this.createRefreshAlarm()

    if (!chrome.alarms.onAlarm.hasListener(this.handleRefreshAlarm)) {
      chrome.alarms.onAlarm.addListener(this.handleRefreshAlarm)
    }
  }

  async refreshCatalog(): Promise<ProviderManifestList> {
    await this.syncCatalog()
    return this.listManifests()
  }

  // Bring the catalog current: seed missing manifests, apply pending updates for
  // sources the user has not installed (no config / user data to disturb), then
  // stamp the check time. Installed-source updates stay manual via the Updates
  // list. lastCheckedAt is recorded here, so "checked Nm ago" only advances when
  // the catalog is actually brought current, never on a bare detection.
  private async syncCatalog(): Promise<void> {
    await this.manifestRegistry.update()
    const pending = await this.manifestRegistry.getPendingUpdates()
    const configs = await this.providerConfigService.getAll()
    const installed = new Set(configs.map((config) => config.manifestId))
    const uninstalled = pending
      .filter((update) => !installed.has(update.manifestId))
      .map((update) => update.manifestId)
    if (uninstalled.length > 0) {
      await this.manifestRegistry.applyUpdates(uninstalled)
    }
    await this.manifestRegistry.recordChecked()
  }

  private async createRefreshAlarm(): Promise<void> {
    const existing = await chrome.alarms.get(alarmKeys.REFRESH_MANIFESTS)
    if (existing) {
      return
    }
    this.logger.debug('Creating manifest refresh alarm')
    await chrome.alarms.create(alarmKeys.REFRESH_MANIFESTS, {
      periodInMinutes: 60 * 12,
      delayInMinutes: 60,
    })
  }

  private handleRefreshAlarm = async (
    alarm: chrome.alarms.Alarm
  ): Promise<void> => {
    if (alarm.name !== alarmKeys.REFRESH_MANIFESTS) {
      return
    }
    await this.syncCatalog()
  }

  // Surfaces the host-relevant subset of a manifest so the popup can render
  // generic affordances (warning icon, cookieSet link, config form) without
  // bundling source-specific switches.
  async getManifestSpec(manifestId: string): Promise<ProviderManifestSpec> {
    await this.manifestRegistry.ready
    try {
      const { manifest } = this.manifestRegistry.getRunner(manifestId)
      return {
        name: manifest.name,
        hasLoginProbe: manifest.loginProbe !== undefined,
        cookieSet: manifest.cookieSet,
        configSchema: manifest.configSchema,
      }
    } catch {
      // Unknown id (legacy:maccms) or a catalog miss: report a minimal spec so
      // the popup degrades to a name-only form instead of rejecting the RPC.
      return { name: '', hasLoginProbe: false }
    }
  }
}
