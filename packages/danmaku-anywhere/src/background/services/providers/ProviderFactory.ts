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
import { MacCmsProviderService } from './MacCmsProviderService'
import { ManifestProviderService } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'

export type IDanmakuProviderFactory = (
  config: ProviderConfig
) => IDanmakuProvider

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

interface DdpConfig {
  chConvert?: number
}

interface DdpCompatConfig {
  baseUrl?: string
  auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
  chConvert?: number
}

interface BuiltinDispatch {
  provider: DanmakuSourceType
  commentMapper: (raw: unknown) => CommentEntity[]
  // Pass user values straight through; defaults come from configSchema.
  extraInputs?: (config: ProviderConfig) => Record<string, unknown>
}

// All builtin manifests emit CommentEntity-shaped rows directly.
const identityCommentMapper = (raw: unknown): CommentEntity[] =>
  raw as CommentEntity[]

const builtinDispatch: Record<string, BuiltinDispatch> = {
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]]: {
    provider: DanmakuSourceType.DanDanPlay,
    commentMapper: identityCommentMapper,
    extraInputs: (config) => {
      const values = config.configValues as DdpConfig
      return { chConvert: values.chConvert }
    },
  },
  [DDP_COMPAT_MANIFEST_ID]: {
    provider: DanmakuSourceType.DanDanPlay,
    commentMapper: identityCommentMapper,
    // extraInputs supplied per-call below (closes over baseUrl/authHeaders).
  },
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]]: {
    provider: DanmakuSourceType.Bilibili,
    commentMapper: identityCommentMapper,
    extraInputs: (config) => {
      const values = config.configValues as { danmakuFormat?: string }
      return { danmakuFormat: values.danmakuFormat }
    },
  },
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]]: {
    provider: DanmakuSourceType.Tencent,
    commentMapper: identityCommentMapper,
  },
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
      const chConvert = values.chConvert
      compatExtras = () => ({ baseUrl, authHeaders, chConvert })
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
    return createDanmakuProvider(
      config,
      context.get<ManifestRegistry>(ManifestRegistry),
      context.get<ILogger>(LoggerSymbol)
    )
  }
}
