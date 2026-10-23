import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import type { SourceRef } from '@/common/errors/AppError'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { effectiveConfigValues } from '@/common/options/providerConfig/builtin'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import { MacCmsProviderService } from './MacCmsProviderService'
import { ManifestProviderService } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'

export type IDanmakuProviderFactory = (
  config: ProviderConfig,
  source: SourceRef
) => IDanmakuProvider

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

function createDanmakuProvider(
  config: ProviderConfig,
  source: SourceRef,
  registry: ManifestRegistry,
  logger: ILogger
): IDanmakuProvider {
  // MacCMS has no manifest; it resolves through the legacy service.
  if (isLegacyMacCms(config)) {
    return new MacCmsProviderService(config, source, logger)
  }
  return new ManifestProviderService(
    {
      source,
      configValues: effectiveConfigValues(config),
    },
    registry,
    logger
  )
}

export function danmakuProviderFactory(
  context: ResolutionContext
): IDanmakuProviderFactory {
  return (config: ProviderConfig, source: SourceRef): IDanmakuProvider => {
    return createDanmakuProvider(
      config,
      source,
      context.get<ManifestRegistry>(ManifestRegistry),
      context.get<ILogger>(LoggerSymbol)
    )
  }
}
