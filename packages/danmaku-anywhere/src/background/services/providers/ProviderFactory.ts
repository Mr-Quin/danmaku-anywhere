import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DDP_COMPAT_MANIFEST_ID } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { MacCmsProviderService } from './MacCmsProviderService'
import { ManifestProviderService } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'

export type IDanmakuProviderFactory = (
  config: ProviderConfig
) => IDanmakuProvider

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

interface DdpCompatConfig {
  baseUrl?: string
  auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
}

// Per-manifest dispatch metadata. The map only carries the canonical
// `DanmakuSourceType` for each builtin; pipeline inputs flow through the
// generic configValues path on ManifestProviderService.
const builtinProvider: Record<string, DanmakuSourceType> = {
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]]:
    DanmakuSourceType.DanDanPlay,
  [DDP_COMPAT_MANIFEST_ID]: DanmakuSourceType.DanDanPlay,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]]:
    DanmakuSourceType.Bilibili,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]]:
    DanmakuSourceType.Tencent,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Youku]]: DanmakuSourceType.Youku,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Mango]]: DanmakuSourceType.Mango,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Iqiyi]]: DanmakuSourceType.Iqiyi,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Sohu]]: DanmakuSourceType.Sohu,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Maiduidui]]:
    DanmakuSourceType.Maiduidui,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Renren]]: DanmakuSourceType.Renren,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Aiyifan]]:
    DanmakuSourceType.Aiyifan,
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bahamut]]:
    DanmakuSourceType.Bahamut,
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
  // DDP-Compat with no baseUrl: fall back to the proxy DDP manifest.
  // (A manifest-id rewrite, not an input transform — keeps living in code.)
  let effectiveManifestId = config.manifestId
  if (config.manifestId === DDP_COMPAT_MANIFEST_ID) {
    const values = config.configValues as DdpCompatConfig
    if (!values.baseUrl?.trim()) {
      effectiveManifestId = PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]
      const hasAuth =
        values.auth?.enabled && (values.auth.headers?.length ?? 0) > 0
      if (hasAuth) {
        logger
          .sub('[ProviderFactory]')
          .warn(
            `DDP-Compat config ${config.id} has authHeaders but empty baseUrl — falling back to proxy-backed DanDanPlay; authHeaders ignored.`
          )
      }
    }
  }
  const provider = builtinProvider[effectiveManifestId]
  if (provider === undefined) {
    throw new Error(`Unknown manifestId: ${config.manifestId}`)
  }
  return new ManifestProviderService(
    {
      manifestId: effectiveManifestId,
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
