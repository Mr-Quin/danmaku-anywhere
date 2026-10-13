import { inject, injectable } from 'inversify'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { SourceError } from '@/common/providers/SourceError'
import {
  NO_CAPABILITIES,
  type SourceCapabilityAnswer,
  type UrlParseSource,
} from '@/common/providers/sourceCapabilities'
import type { IDanmakuProvider } from './IDanmakuProvider'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

type GatedCapability = 'episodes' | 'danmaku'

export function withUrlScheme(text: string): string {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

function unsupported(
  capability: GatedCapability,
  sourceName: string
): SourceError {
  if (capability === 'episodes') {
    return new SourceError(
      'episodesUnsupported',
      `${sourceName} does not support fetching episodes`,
      sourceName
    )
  }
  return new SourceError(
    'refetchUnsupported',
    `${sourceName} episodes cannot be refetched`,
    sourceName
  )
}

@injectable('Singleton')
export class SourceCapabilityService {
  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory
  ) {}

  async forProviderConfig(
    providerConfigId: string
  ): Promise<SourceCapabilityAnswer> {
    const config = await this.providerConfigService.get(providerConfigId)
    if (!config) {
      return { sourceRemoved: true, capabilities: NO_CAPABILITIES }
    }
    const capabilities =
      await this.danmakuProviderFactory(config).getCapabilities()
    return { sourceRemoved: false, capabilities }
  }

  async providerFor(
    config: ProviderConfig,
    capability: GatedCapability
  ): Promise<IDanmakuProvider> {
    const provider = this.danmakuProviderFactory(config)
    const capabilities = await provider.getCapabilities()
    if (!capabilities[capability]) {
      throw unsupported(capability, config.name)
    }
    return provider
  }

  async getAutomaticProviders(): Promise<ProviderConfig[]> {
    const configs = await this.providerConfigService.getAll()
    const automatic: ProviderConfig[] = []
    for (const config of configs) {
      if (!config.enabled) {
        continue
      }
      const capabilities =
        await this.danmakuProviderFactory(config).getCapabilities()
      if (capabilities.automaticMatch) {
        automatic.push(config)
      }
    }
    return automatic
  }

  async getFirstAutomaticProvider(): Promise<ProviderConfig | undefined> {
    const [first] = await this.getAutomaticProviders()
    return first
  }

  // Ignores enablement: a pasted URL is parsed by whichever installed source
  // recognizes it, even one switched off for search.
  async findUrlParsers(text: string): Promise<ProviderConfig[]> {
    const url = withUrlScheme(text)
    const configs = await this.providerConfigService.getAll()
    const parsers: ProviderConfig[] = []
    for (const config of configs) {
      const provider = this.danmakuProviderFactory(config)
      const capabilities = await provider.getCapabilities()
      if (capabilities.parseUrl && (await provider.canParse(url))) {
        parsers.push(config)
      }
    }
    return parsers
  }

  async findUrlSource(text: string): Promise<UrlParseSource | null> {
    const [parser] = await this.findUrlParsers(text)
    if (!parser) {
      return null
    }
    return { sourceName: parser.name }
  }
}
