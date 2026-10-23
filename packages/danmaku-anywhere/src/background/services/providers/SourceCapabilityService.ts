import { inject, injectable } from 'inversify'
import {
  AppError,
  type AppErrorCode,
  type SourceRef,
} from '@/common/errors/AppError'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import { resolveSeasonConfig } from '@/common/providers/resolveSeasonConfig'
import {
  canMatchBySearch,
  canResolveMapping,
  LEGACY_MACCMS_CAPABILITIES,
  type SourceCapabilities,
  type SourceCapability,
  type SourceCapabilityAnswer,
  type SourceStatus,
  type UrlSourceAnswer,
} from '@/common/providers/sourceCapabilities'
import { withUrlScheme } from '@/common/utils/link'
import type { IDanmakuProvider, SourceProvider } from './IDanmakuProvider'
import { manifestStatus } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'
import { SourceNames } from './SourceNames'

type SourceOperation = 'episodes' | 'danmaku' | 'seasonRefresh'

interface UrlParser {
  source: SourceRef
  provider: SourceProvider
}

const UNSUPPORTED = {
  search: 'source.searchUnsupported',
  episodes: 'source.episodesUnsupported',
  danmaku: 'source.danmakuUnsupported',
  seasonRefresh: 'source.seasonRefreshUnsupported',
} as const satisfies Record<Exclude<SourceCapability, 'parseUrl'>, AppErrorCode>

function unsupported(
  source: SourceRef,
  status: SourceStatus,
  capability: SourceCapability
): AppError {
  if (status.status === 'unavailable') {
    return new AppError(
      'source.unavailable',
      { source, reason: status.reason },
      { message: `${source.name} is unavailable: ${status.reason}` }
    )
  }
  if (capability === 'parseUrl') {
    return new AppError(
      'source.noUrlParser',
      {},
      { message: `${source.name} cannot parse links` }
    )
  }
  return new AppError(
    UNSUPPORTED[capability],
    { source },
    { message: `${source.name} cannot do ${capability}` }
  )
}

@injectable('Singleton')
export class SourceCapabilityService {
  private readonly logger: ILogger

  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory,
    @inject(SourceNames)
    private sourceNames: SourceNames,
    @inject(ManifestRegistry)
    private manifestRegistry: ManifestRegistry,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[SourceCapabilityService]')
  }

  async forProviderConfig(
    providerConfigId: string
  ): Promise<SourceCapabilityAnswer> {
    const config = resolveSeasonConfig(
      { providerConfigId },
      await this.providerConfigService.getAll()
    )
    if (!config) {
      return { status: 'removed' }
    }
    if (isLegacyMacCms(config)) {
      return { status: 'available', capabilities: LEGACY_MACCMS_CAPABILITIES }
    }
    return manifestStatus(await this.manifestRegistry.lookup(config.manifestId))
  }

  async searchProvider(config: ProviderConfig): Promise<IDanmakuProvider> {
    const source = await this.sourceNames.refOf(config)
    const provider = this.danmakuProviderFactory(config, source)
    await this.require(source, provider, 'search')
    return provider
  }

  async sourceProvider(
    config: ProviderConfig,
    operation: SourceOperation
  ): Promise<SourceProvider> {
    const source = await this.sourceNames.refOf(config)
    const provider = this.danmakuProviderFactory(config, source)
    const status = await this.require(source, provider, operation)
    if (provider.kind === 'searchOnly') {
      throw unsupported(source, status, operation)
    }
    return provider
  }

  async getFirstSearchMatchProvider(): Promise<ProviderConfig | undefined> {
    const configs = await this.providerConfigService.getAll()
    const refOf = await this.sourceNames.refs()
    for (const config of configs) {
      if (!config.enabled) {
        continue
      }
      const source = refOf(config)
      const provider = this.danmakuProviderFactory(config, source)
      const capabilities = await this.capabilitiesOrNone(source, provider)
      if (capabilities && canMatchBySearch(capabilities)) {
        return config
      }
    }
    return undefined
  }

  async getMappingProviders(): Promise<ProviderConfig[]> {
    return this.enabledWhere(canResolveMapping)
  }

  // Ignores enablement: a pasted URL is parsed by whichever installed source
  // recognizes it, even one switched off for search.
  async getUrlParsers(): Promise<UrlParser[]> {
    const configs = await this.providerConfigService.getAll()
    const refOf = await this.sourceNames.refs()
    const parsers: UrlParser[] = []
    for (const config of configs) {
      const source = refOf(config)
      const provider = this.danmakuProviderFactory(config, source)
      if (provider.kind === 'searchOnly') {
        continue
      }
      const capabilities = await this.capabilitiesOrNone(source, provider)
      if (capabilities?.parseUrl) {
        parsers.push({ source, provider })
      }
    }
    return parsers
  }

  async findUrlSource(text: string): Promise<UrlSourceAnswer> {
    const url = withUrlScheme(text)
    for (const { source, provider } of await this.getUrlParsers()) {
      if (await this.matchesUrl(source, provider, url)) {
        return { kind: 'parseable', sourceName: source.name }
      }
    }
    return { kind: 'unclaimed' }
  }

  private async matchesUrl(
    source: SourceRef,
    provider: SourceProvider,
    url: string
  ): Promise<boolean> {
    try {
      return await provider.canParse(url)
    } catch (e) {
      this.logger.error(`Skipping source ${source.name}:`, e)
      return false
    }
  }

  private async require(
    source: SourceRef,
    provider: IDanmakuProvider,
    capability: SourceCapability
  ): Promise<SourceStatus> {
    const status = await provider.getStatus()
    if (status.status !== 'available' || !status.capabilities[capability]) {
      throw unsupported(source, status, capability)
    }
    return status
  }

  private async enabledWhere(
    qualifies: (capabilities: SourceCapabilities) => boolean
  ): Promise<ProviderConfig[]> {
    const configs = await this.providerConfigService.getAll()
    const refOf = await this.sourceNames.refs()
    const matching: ProviderConfig[] = []
    for (const config of configs) {
      if (!config.enabled) {
        continue
      }
      const source = refOf(config)
      const provider = this.danmakuProviderFactory(config, source)
      const capabilities = await this.capabilitiesOrNone(source, provider)
      if (capabilities && qualifies(capabilities)) {
        matching.push(config)
      }
    }
    return matching
  }

  // These loops run over every config, so a source that cannot load is
  // skipped rather than failing the whole pass.
  private async capabilitiesOrNone(
    source: SourceRef,
    provider: IDanmakuProvider
  ): Promise<SourceCapabilities | undefined> {
    try {
      const status = await provider.getStatus()
      if (status.status === 'unavailable') {
        this.logger.warn(
          `Skipping source ${source.name} (${source.manifestId}): ${status.reason}`
        )
        return undefined
      }
      return status.capabilities
    } catch (e) {
      this.logger.error(`Skipping source ${source.name}:`, e)
      return undefined
    }
  }
}
