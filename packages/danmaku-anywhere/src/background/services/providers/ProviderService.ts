import type {
  CustomSeason,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { getDisplayStrings } from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import type { SeasonQueryFilter, SeasonSearchRequest } from '@/common/anime/dto'
import type {
  DanmakuFetchByMeta,
  DanmakuFetchRequest,
  DanmakuFetchResult,
} from '@/common/danmaku/dto'
import { AppError, type SourceRef } from '@/common/errors/AppError'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { toManifestLocale } from '@/common/localization/language'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import {
  AUTO_IMPORT_PROVIDERS,
  autoImportToProviderConfig,
} from '@/common/options/providerConfig/constant'
import { localizeLegacyBuiltinNames } from '@/common/options/providerConfig/localizeLegacyNames'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import { resolveSeasonConfig } from '@/common/providers/resolveSeasonConfig'
import type {
  ProviderLoginStatus,
  ProviderManifestList,
  ProviderManifestSpec,
} from '@/common/rpcClient/background/types'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { OmitSeasonId } from './IDanmakuProvider'
import { MANIFEST_RUN_OPTIONS } from './ManifestProviderService'
import { type CatalogSyncResult, ManifestRegistry } from './ManifestRegistry'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

function toSourceRef(config: ProviderConfig): SourceRef {
  return {
    providerConfigId: config.id,
    manifestId: config.manifestId,
    name: config.name,
  }
}

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
  private seeding: Promise<void> | null = null

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
    @inject(BookmarkService)
    private bookmarkService: BookmarkService,
    @inject(LoggerSymbol) logger: ILogger,
    @inject(ExtensionOptionsService)
    private extensionOptions: ExtensionOptionsService
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
    const providerConfig = await this.providerConfigService.mustGet(
      params.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)

    const seasonInserts = await service.search(params)
    // TODO: fix this once we fold custom seasons into the season insert
    if (isLegacyMacCms(providerConfig)) {
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

  // Resolves the config a season was saved under, raising a clear "source
  // removed" error when the config has been deleted (the season is orphaned).
  // The UI blocks refresh affordances for orphaned seasons, so this is the
  // fallback for any path that still reaches a provider call.
  private async getConfigForSeason(season: {
    providerConfigId: string
  }): Promise<ProviderConfig> {
    const config = resolveSeasonConfig(
      season,
      await this.providerConfigService.getAll()
    )
    if (!config) {
      throw new AppError(
        'source.removed',
        {},
        {
          message:
            'This source has been removed, so new danmaku cannot be fetched.',
        }
      )
    }
    return config
  }

  async fetchEpisodesBySeason(
    seasonId: number
  ): Promise<WithSeason<EpisodeMeta>[]> {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await this.getConfigForSeason(season)

    const service = this.danmakuProviderFactory(providerConfig)
    if (!service.getEpisodes) {
      throw new AppError(
        'source.episodesUnsupported',
        { source: toSourceRef(providerConfig) },
        { message: `${providerConfig.name} does not support fetching episodes` }
      )
    }
    const episodes = await service.getEpisodes(season.providerIds)
    return episodes.map((episode) => enrichEpisode(episode, season))
  }

  async refreshSeason(filter: SeasonQueryFilter) {
    const [season] = await this.seasonService.filter(filter)
    if (!season) {
      throw new Error('No season found for refresh filter')
    }

    const providerConfig = await this.getConfigForSeason(season)

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

  async getDanmaku(request: DanmakuFetchRequest): Promise<DanmakuFetchResult> {
    const resolved = await this.resolveMeta(request)
    const { options = {}, meta } = resolved

    const [existingDanmaku] = await this.danmakuService.filter({
      indexedId: meta.indexedId,
      seasonId: meta.seasonId,
    })

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      return { episode: existingDanmaku }
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const config = await this.getConfigForSeason(meta.season)

    const service = this.danmakuProviderFactory(config)
    if (!service.getDanmaku) {
      throw new AppError(
        'source.refetchUnsupported',
        { source: toSourceRef(config) },
        { message: `${config.name} episodes cannot be refetched` }
      )
    }

    const comments = await service.getDanmaku(resolved)

    if (options.automatic && comments.length === 0) {
      throw new AppError(
        'source.noDanmaku',
        { title: meta.title },
        { message: `No danmaku found for ${meta.title}` }
      )
    }

    const { season, ...rest } = meta

    const { episode, keptStored } = await this.danmakuService.upsertUnlessFewer(
      {
        ...rest,
        seasonId: season.id,
        comments,
        commentCount: comments.length,
        lastChecked: Date.now(),
      }
    )

    if (keptStored) {
      this.logger.warn(
        `Fetch returned ${keptStored.fetchedCount} comments, fewer than the ${keptStored.storedCount} stored; keeping the stored episode`
      )
      return { episode: { ...episode, season }, keptStored }
    }

    return { episode: { ...episode, season } }
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

    throw new AppError(
      'source.noUrlParser',
      {},
      { message: 'No provider found capable of parsing URL' }
    )
  }

  async probeLogin<T = unknown>(manifestId: string): Promise<T | null> {
    await this.manifestRegistry.ready
    return this.manifestRegistry
      .getRunner(manifestId)
      .runLoginProbe<T>(undefined, MANIFEST_RUN_OPTIONS)
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

  // Removes a user manifest along with its config instances and their
  // bookmarks. Seasons and episodes stay orphaned-but-viewable, the same
  // semantics as deleting a single provider config. Each config goes only
  // after its bookmarks, and the manifest unregisters last, so a retry after a
  // partial failure still finds whatever is left to clean up.
  async deleteUserManifest(manifestId: string): Promise<void> {
    const source = await this.manifestRegistry.getSource(manifestId)
    if (source?.kind !== 'user') {
      throw new Error('Only user manifests can be deleted')
    }
    const configs = await this.providerConfigService.getAll()
    for (const config of configs) {
      if (config.manifestId === manifestId) {
        await this.bookmarkService.deleteByProviderConfig(config.id)
        await this.providerConfigService.deleteFromStorage(config.id)
      }
    }
    await this.manifestRegistry.unregister(manifestId)
  }

  // Lists every registered manifest plus the last catalog-check timestamp so
  // the popup can render the catalog section (registered manifests the user
  // has no config for) without bundling the manifest set itself.
  async listManifests(locale?: string): Promise<ProviderManifestList> {
    await this.manifestRegistry.ready
    return {
      manifests: this.manifestRegistry.listManifests(locale),
      lastCheckedAt: await this.manifestRegistry.getLastCheckedAt(),
    }
  }

  setup(): void {
    chrome.runtime.onInstalled.addListener((details) => {
      return this.onInstalled(details.reason).catch((e) => {
        this.logger.error('Install handling failed:', e)
      })
    })
    this.manifestRegistry.ready.catch((e) => {
      this.logger.error('Failed to load manifests:', e)
    })
  }

  private async onInstalled(reason: string): Promise<void> {
    const lockedExistingInstall =
      reason === 'update' && (await this.lockSeedForExistingInstall())
    // The seed flag is already locked, so a sync failure here must not skip
    // the one chance to rename.
    try {
      await this.syncCatalog()
    } finally {
      if (lockedExistingInstall) {
        await this.localizeLegacyBuiltinNames()
      }
    }
  }

  // Lock the flag for an existing install so its configs are never re-seeded,
  // even if the user has deleted them all. An unset flag with no configs is a
  // different user: their first-run seed never happened, so leave them
  // unlocked for the sync that follows to heal. Returns whether it locked.
  private async lockSeedForExistingInstall(): Promise<boolean> {
    if (await this.providerConfigService.hasSeeded()) {
      return false
    }
    const configs = await this.providerConfigService.getAll()
    if (configs.length === 0) {
      return false
    }
    await this.providerConfigService.markSeeded()
    return true
  }

  // Only for configs that came from pre-manifest storage (the update that
  // locked the seed flag, or a restored pre-manifest backup), so a name the
  // user sets later is never touched.
  async localizeLegacyBuiltinNames(): Promise<void> {
    await this.manifestRegistry.ready
    const { lang } = await this.extensionOptions.get()
    const names = new Map(
      this.manifestRegistry
        .listManifests(toManifestLocale(lang))
        .map((m) => [m.id, m.name])
    )
    const configs = await this.providerConfigService.getAll()
    const localized = localizeLegacyBuiltinNames(configs, names)
    if (localized !== configs) {
      await this.providerConfigService.options.set(localized)
    }
  }

  // Throws on a catalog that produced no usable list so a user-driven refresh
  // surfaces the failure instead of silently returning the stale list, and
  // says which failure it was: a catalog that answered but offers nothing this
  // build can run is not a network problem.
  async refreshCatalog(locale?: string): Promise<ProviderManifestList> {
    const result = await this.syncCatalog()
    if (result === 'unreachable') {
      throw new AppError('catalog.unreachable')
    }
    if (result === 'empty') {
      throw new AppError('catalog.empty')
    }
    return this.listManifests(locale)
  }

  // Bring the catalog current: updates for uninstalled sources (no config or
  // user data to disturb) are applied here, while installed-source updates stay
  // manual via the Updates list. Records the check only on a real sync, so
  // "checked Nm ago" never advances on a bare detection. Returns how the
  // catalog index resolved.
  async syncCatalog(): Promise<CatalogSyncResult> {
    const result = await this.manifestRegistry.update()
    if (result === 'synced') {
      // update() just reached the index, so a failure here means it died
      // mid-sync; skip the best-effort auto-apply rather than fail the sync.
      const pending = await this.manifestRegistry
        .getPendingUpdates()
        .catch((e) => {
          this.logger.warn('Failed to detect pending updates mid-sync:', e)
          return []
        })
      const configs = await this.providerConfigService.getAll()
      const installed = new Set(configs.map((config) => config.manifestId))
      const uninstalled = pending
        .filter((update) => !installed.has(update.manifestId))
        .map((update) => update.manifestId)
      if (uninstalled.length > 0) {
        try {
          await this.manifestRegistry.applyUpdates(uninstalled)
        } catch (e) {
          // Best-effort: a failed background apply retries next sync and must
          // not block recording the check or the rest of the refresh.
          this.logger.warn('Failed to auto-apply catalog updates:', e)
        }
      }
      await this.manifestRegistry.recordChecked()
    }
    // The registry holds the bundled manifests from startup, so an unusable
    // catalog still seeds working sources instead of an empty list.
    await this.seedDefaultProviders()
    return result
  }

  // syncCatalog can run concurrently (install, alarm, popup refresh) and the
  // seeded flag is read asynchronously, so two in-flight seeds can both pass
  // the check. Sharing the run keeps the write single.
  seedDefaultProviders(): Promise<void> {
    this.seeding ??= this.runSeedDefaultProviders().finally(() => {
      this.seeding = null
    })
    return this.seeding
  }

  // Seed the preloaded configs once, after the registry is populated so each
  // name comes from its manifest. Skips entirely until every preloaded manifest
  // is present so a transient partial fetch never seeds a subset and then locks.
  private async runSeedDefaultProviders(): Promise<void> {
    if (await this.providerConfigService.hasSeeded()) {
      return
    }
    // The flag and the configs share chrome.storage.sync, so on a signed-in
    // profile the flag can still read as unset while the user's real configs
    // are arriving. Any config at all means this is not a blank slate, and
    // seeding over it would push the defaults out to every other device.
    const existing = await this.providerConfigService.getAll()
    if (existing.length > 0) {
      await this.providerConfigService.markSeeded()
      return
    }
    await this.manifestRegistry.ready
    const { lang } = await this.extensionOptions.get()
    const names = new Map(
      this.manifestRegistry
        .listManifests(toManifestLocale(lang))
        .map((m) => [m.id, m.name])
    )
    const configs: ProviderConfig[] = []
    for (const entry of AUTO_IMPORT_PROVIDERS) {
      const name = names.get(entry.manifestId)
      if (name === undefined) {
        return
      }
      configs.push(autoImportToProviderConfig(entry, name))
    }
    await this.providerConfigService.options.set(configs)
    await this.providerConfigService.markSeeded()
  }

  // Surfaces the host-relevant subset of a manifest so the popup can render
  // generic affordances (warning icon, cookieSet link, config form) without
  // bundling source-specific switches. Display strings resolve into `locale`.
  async getManifestSpec(
    manifestId: string,
    locale?: string
  ): Promise<ProviderManifestSpec> {
    await this.manifestRegistry.ready
    const { manifest } = this.manifestRegistry.getRunner(manifestId)
    const display = getDisplayStrings(manifest, locale)
    return {
      name: display.name,
      hasLoginProbe: manifest.loginProbe !== undefined,
      cookieSet: manifest.cookieSet
        ? { url: manifest.cookieSet.url, title: display.cookieSet?.title }
        : undefined,
      configSchema: display.configSchema,
    }
  }
}
