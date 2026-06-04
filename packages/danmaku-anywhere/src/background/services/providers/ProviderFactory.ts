import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { MacCmsProviderService } from './MacCmsProviderService'
import { ManifestProviderService } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'

export type IDanmakuProviderFactory = (
  config: ProviderConfig
) => IDanmakuProvider

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

// Per-manifest dispatch metadata. The map only carries the canonical
// `DanmakuSourceType` for each builtin; pipeline inputs flow through the
// generic configValues path on ManifestProviderService.
const builtinProvider: Record<string, DanmakuSourceType> = {
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]]:
    DanmakuSourceType.DanDanPlay,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]]:
    DanmakuSourceType.Bilibili,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]]:
    DanmakuSourceType.Tencent,
}

function createDanmakuProvider(
  config: ProviderConfig,
  registry: ManifestRegistry,
  logger: ILogger
): IDanmakuProvider {
  // MacCMS still uses the legacy service until a template manifest ships.
  if (config.manifestId === LEGACY_MACCMS_ID) {
    return new MacCmsProviderService(config, logger)
  }
  const provider = builtinProvider[config.manifestId]
  if (provider === undefined) {
    throw new Error(`Unknown manifestId: ${config.manifestId}`)
  }
  return new ManifestProviderService(
    {
      manifestId: config.manifestId,
      provider,
      providerConfigId: config.id,
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
