import {
  type CommentEntity,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DDP_COMPAT_MANIFEST_ID } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { BilibiliMapper } from './bilibili/BilibiliMapper'
import { DanDanPlayMapper } from './dandanplay/DanDanPlayMapper'
import { MacCmsProviderService } from './MacCmsProviderService'
import { ManifestProviderService } from './ManifestProviderService'
import { getManifestRegistry } from './ManifestRegistry'
import { TencentMapper } from './tencent/TencentMapper'

export type IDanmakuProviderFactory = (
  config: ProviderConfig
) => IDanmakuProvider

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

// Adapter: ManifestProviderService hands the mapper an `unknown` payload
// (the raw output of the manifest's danmaku pipeline). Mappers are typed
// to a specific shape they expect. Goes away when DA-477's per-row `map`
// step kind moves the transform into the manifest.
function withMapper<T>(
  fn: (arg: T) => CommentEntity[]
): (raw: unknown) => CommentEntity[] {
  return (raw) => fn(raw as T)
}

interface DdpCompatConfig {
  baseUrl?: string
  auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
}

function createDanmakuProvider(
  config: ProviderConfig,
  logger: ILogger
): IDanmakuProvider {
  const registry = getManifestRegistry()
  // MacCMS still routes to its legacy service until Phase 4 ships a
  // template manifest.
  if (config.manifestId === LEGACY_MACCMS_ID) {
    return new MacCmsProviderService(config, logger)
  }
  switch (config.manifestId) {
    case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]:
      return new ManifestProviderService(
        {
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
          provider: DanmakuSourceType.DanDanPlay,
          providerConfigId: config.id,
          commentMapper: withMapper(
            DanDanPlayMapper.manifestCommentsToComments
          ),
        },
        registry,
        logger
      )
    case DDP_COMPAT_MANIFEST_ID: {
      const values = config.configValues as DdpCompatConfig
      const baseUrl = values.baseUrl?.trim()
      // DDP-Compat without a baseUrl falls back to the proxy-backed
      // dandanplay manifest.
      if (!baseUrl) {
        return new ManifestProviderService(
          {
            manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
            provider: DanmakuSourceType.DanDanPlay,
            providerConfigId: config.id,
            commentMapper: withMapper(
              DanDanPlayMapper.manifestCommentsToComments
            ),
          },
          registry,
          logger
        )
      }
      const authHeaders =
        values.auth?.enabled && values.auth.headers ? values.auth.headers : []
      return new ManifestProviderService(
        {
          manifestId: DDP_COMPAT_MANIFEST_ID,
          provider: DanmakuSourceType.DanDanPlay,
          providerConfigId: config.id,
          extraInputs: () => ({ baseUrl, authHeaders }),
          commentMapper: withMapper(
            DanDanPlayMapper.manifestCommentsToComments
          ),
        },
        registry,
        logger
      )
    }
    case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]: {
      const values = config.configValues as { danmakuFormat?: string }
      return new ManifestProviderService(
        {
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
          provider: DanmakuSourceType.Bilibili,
          providerConfigId: config.id,
          commentMapper: withMapper(BilibiliMapper.manifestSegmentsToComments),
          extraInputs: () => ({ danmakuFormat: values.danmakuFormat ?? 'xml' }),
        },
        registry,
        logger
      )
    }
    case PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]:
      return new ManifestProviderService(
        {
          manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
          provider: DanmakuSourceType.Tencent,
          providerConfigId: config.id,
          commentMapper: withMapper(TencentMapper.manifestBarrageToComments),
        },
        registry,
        logger
      )
    default:
      throw new Error(`Unknown manifestId: ${config.manifestId}`)
  }
}

export function danmakuProviderFactory(
  context: ResolutionContext
): IDanmakuProviderFactory {
  return (config: ProviderConfig): IDanmakuProvider => {
    return createDanmakuProvider(config, context.get<ILogger>(LoggerSymbol))
  }
}
