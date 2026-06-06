import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
} from '@danmaku-anywhere/danmaku-converter'
import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { invariant } from '@/common/utils/utils'
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
  if (config.manifestId === LEGACY_MACCMS_ID) {
    return new MacCmsProviderService(config, logger)
  }
  // The Custom impl shares MacCMS's enum value; a manifest source carrying it
  // would be read as custom danmaku by `isNotCustom` consumers. Identity is the
  // manifestId, so impl is only the persisted provider tag and must stay real.
  invariant(
    config.impl !== DanmakuSourceType.Custom,
    `Provider config ${config.id} (${config.manifestId}) cannot use the Custom impl`
  )
  return new ManifestProviderService(
    {
      manifestId: config.manifestId,
      provider: config.impl,
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
