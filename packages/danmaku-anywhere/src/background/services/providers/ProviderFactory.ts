import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import { MacCmsProviderService } from './MacCmsProviderService'
import { ManifestProviderService } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'

export type IDanmakuProviderFactory = (
  config: ProviderConfig
) => IDanmakuProvider

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

function createDanmakuProvider(
  config: ProviderConfig,
  registry: ManifestRegistry,
  logger: ILogger
): IDanmakuProvider {
  // MacCMS has no manifest; it resolves through the legacy service.
  if (isLegacyMacCms(config)) {
    return new MacCmsProviderService(config, logger)
  }
  return new ManifestProviderService(
    {
      manifestId: config.manifestId,
      providerConfigId: config.id,
      sourceName: config.name,
      configValues: config.configValues,
    },
    registry,
    logger
  )
}

export function danmakuProviderFactory(
  context: ResolutionContext
): IDanmakuProviderFactory {
  return (config: ProviderConfig): IDanmakuProvider => {
    return createDanmakuProvider(
      config,
      context.get<ManifestRegistry>(ManifestRegistry),
      context.get<ILogger>(LoggerSymbol)
    )
  }
}
