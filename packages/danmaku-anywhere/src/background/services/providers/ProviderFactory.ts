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

interface BuiltinDispatch {
  provider: DanmakuSourceType
  commentMapper: (raw: unknown) => CommentEntity[]
  // Pass user values straight through; defaults come from configSchema.
  extraInputs?: (config: ProviderConfig) => Record<string, unknown>
}

const builtinDispatch: Record<string, BuiltinDispatch> = {
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]]: {
    provider: DanmakuSourceType.DanDanPlay,
    commentMapper: withMapper(DanDanPlayMapper.manifestCommentsToComments),
  },
  [DDP_COMPAT_MANIFEST_ID]: {
    provider: DanmakuSourceType.DanDanPlay,
    commentMapper: withMapper(DanDanPlayMapper.manifestCommentsToComments),
    // extraInputs supplied per-call below (closes over baseUrl/authHeaders).
  },
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]]: {
    provider: DanmakuSourceType.Bilibili,
    commentMapper: withMapper(BilibiliMapper.manifestSegmentsToComments),
    extraInputs: (config) => {
      const values = config.configValues as { danmakuFormat?: string }
      return { danmakuFormat: values.danmakuFormat }
    },
  },
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]]: {
    provider: DanmakuSourceType.Tencent,
    commentMapper: withMapper(TencentMapper.manifestBarrageToComments),
  },
}

function createDanmakuProvider(
  config: ProviderConfig,
  logger: ILogger
): IDanmakuProvider {
  const registry = getManifestRegistry()
  // MacCMS still uses the legacy service until a template manifest ships.
  if (config.manifestId === LEGACY_MACCMS_ID) {
    return new MacCmsProviderService(config, logger)
  }
  // DDP-Compat with no baseUrl: fall back to the proxy DDP manifest.
  let effectiveManifestId = config.manifestId
  let compatExtras: BuiltinDispatch['extraInputs']
  if (config.manifestId === DDP_COMPAT_MANIFEST_ID) {
    const values = config.configValues as DdpCompatConfig
    const baseUrl = values.baseUrl?.trim()
    if (!baseUrl) {
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
    } else {
      const authHeaders =
        values.auth?.enabled && values.auth.headers ? values.auth.headers : []
      compatExtras = () => ({ baseUrl, authHeaders })
    }
  }
  const entry = builtinDispatch[effectiveManifestId]
  if (entry === undefined) {
    throw new Error(`Unknown manifestId: ${config.manifestId}`)
  }
  const extras = compatExtras ?? entry.extraInputs
  return new ManifestProviderService(
    {
      manifestId: effectiveManifestId,
      provider: entry.provider,
      providerConfigId: config.id,
      commentMapper: entry.commentMapper,
      extraInputs: extras ? () => extras(config) : undefined,
    },
    registry,
    logger
  )
}

export function danmakuProviderFactory(
  context: ResolutionContext
): IDanmakuProviderFactory {
  return (config: ProviderConfig): IDanmakuProvider => {
    return createDanmakuProvider(config, context.get<ILogger>(LoggerSymbol))
  }
}
