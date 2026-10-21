import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { resolveSeasonConfig } from '@/common/providers/resolveSeasonConfig'
import { SourceError, type SourceProblem } from '@/common/providers/SourceError'
import {
  canMatchBySearch,
  canResolveMapping,
  type SourceCapabilities,
  type SourceCapability,
  type SourceCapabilityAnswer,
  type SourceStatus,
  type UrlSourceAnswer,
} from '@/common/providers/sourceCapabilities'
import { withUrlScheme } from '@/common/utils/link'
import type { IDanmakuProvider, SourceProvider } from './IDanmakuProvider'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

type SourceOperation = 'episodes' | 'danmaku' | 'seasonRefresh'

interface UrlParser {
  config: ProviderConfig
  provider: SourceProvider
}

const UNSUPPORTED: Record<
  SourceCapability,
  { problem: SourceProblem; message: string }
> = {
  search: { problem: 'searchUnsupported', message: 'cannot search' },
  episodes: { problem: 'episodesUnsupported', message: 'cannot list episodes' },
  danmaku: { problem: 'danmakuUnsupported', message: 'cannot fetch danmaku' },
  seasonRefresh: {
    problem: 'seasonRefreshUnsupported',
    message: 'cannot refresh season details',
  },
  parseUrl: { problem: 'noUrlParser', message: 'cannot parse links' },
}

function unsupported(
  sourceName: string,
  status: SourceStatus,
  capability: SourceCapability
): SourceError {
  if (status.status === 'unavailable') {
    return new SourceError(
      'sourceUnavailable',
      `${sourceName} is unavailable: ${status.reason}`,
      sourceName
    )
  }
  const { problem, message } = UNSUPPORTED[capability]
  return new SourceError(problem, `${sourceName} ${message}`, sourceName)
}

@injectable('Singleton')
export class SourceCapabilityService {
  private readonly logger: ILogger

  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory,
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
    return this.danmakuProviderFactory(config).getStatus()
  }

  async searchProvider(config: ProviderConfig): Promise<IDanmakuProvider> {
    const provider = this.danmakuProviderFactory(config)
    await this.require(config, provider, 'search')
    return provider
  }

  async sourceProvider(
    config: ProviderConfig,
    operation: SourceOperation
  ): Promise<SourceProvider> {
    const provider = this.danmakuProviderFactory(config)
    const status = await this.require(config, provider, operation)
    if (provider.kind === 'searchOnly') {
      throw unsupported(config.name, status, operation)
    }
    return provider
  }

  async getFirstSearchMatchProvider(): Promise<ProviderConfig | undefined> {
    for (const config of await this.providerConfigService.getAll()) {
      if (!config.enabled) {
        continue
      }
      const provider = this.danmakuProviderFactory(config)
      const capabilities = await this.capabilitiesOrNone(config, provider)
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
    const parsers: UrlParser[] = []
    for (const config of configs) {
      const provider = this.danmakuProviderFactory(config)
      if (provider.kind === 'searchOnly') {
        continue
      }
      const capabilities = await this.capabilitiesOrNone(config, provider)
      if (capabilities?.parseUrl) {
        parsers.push({ config, provider })
      }
    }
    return parsers
  }

  async findUrlSource(text: string): Promise<UrlSourceAnswer> {
    const url = withUrlScheme(text)
    for (const { config, provider } of await this.getUrlParsers()) {
      if (await this.matchesUrl(config, provider, url)) {
        return { kind: 'parseable', sourceName: config.name }
      }
    }
    return { kind: 'unclaimed' }
  }

  private async matchesUrl(
    config: ProviderConfig,
    provider: SourceProvider,
    url: string
  ): Promise<boolean> {
    try {
      return await provider.canParse(url)
    } catch (e) {
      this.logger.error(`Skipping source ${config.name}:`, e)
      return false
    }
  }

  private async require(
    config: ProviderConfig,
    provider: IDanmakuProvider,
    capability: SourceCapability
  ): Promise<SourceStatus> {
    const status = await provider.getStatus()
    if (status.status !== 'available' || !status.capabilities[capability]) {
      throw unsupported(config.name, status, capability)
    }
    return status
  }

  private async enabledWhere(
    qualifies: (capabilities: SourceCapabilities) => boolean
  ): Promise<ProviderConfig[]> {
    const configs = await this.providerConfigService.getAll()
    const matching: ProviderConfig[] = []
    for (const config of configs) {
      if (!config.enabled) {
        continue
      }
      const provider = this.danmakuProviderFactory(config)
      const capabilities = await this.capabilitiesOrNone(config, provider)
      if (capabilities && qualifies(capabilities)) {
        matching.push(config)
      }
    }
    return matching
  }

  // These loops run over every config, so a source that cannot load is
  // skipped rather than failing the whole pass.
  private async capabilitiesOrNone(
    config: ProviderConfig,
    provider: IDanmakuProvider
  ): Promise<SourceCapabilities | undefined> {
    try {
      const status = await provider.getStatus()
      if (status.status === 'unavailable') {
        this.logger.warn(
          `Skipping source ${config.name} (${config.manifestId}): ${status.reason}`
        )
        return undefined
      }
      return status.capabilities
    } catch (e) {
      this.logger.error(`Skipping source ${config.name}:`, e)
      return undefined
    }
  }
}
