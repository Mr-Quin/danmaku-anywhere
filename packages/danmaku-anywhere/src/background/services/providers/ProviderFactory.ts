import {
  type CommentEntity,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
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

function createDanmakuProvider(
  config: ProviderConfig,
  logger: ILogger
): IDanmakuProvider {
  const registry = getManifestRegistry()
  switch (config.impl) {
    case DanmakuSourceType.DanDanPlay: {
      // DDP-Compat with a configured baseUrl routes to the ddp-compat
      // manifest with the user's baseUrl + auth headers injected. Anything
      // else (regular DanDanPlay, or DDP-Compat without baseUrl) goes
      // through the proxy-backed dandanplay manifest.
      const ddpCommentMapper = withMapper(
        DanDanPlayMapper.manifestCommentsToComments
      )
      if (
        config.type === 'DanDanPlayCompatible' &&
        config.options.baseUrl?.trim()
      ) {
        const baseUrl = config.options.baseUrl.trim()
        const { auth } = config.options
        const authHeaders = auth?.enabled && auth.headers ? auth.headers : []
        return new ManifestProviderService(
          {
            manifestId: 'builtin:ddp-compat',
            provider: DanmakuSourceType.DanDanPlay,
            providerConfigId: config.id,
            extraInputs: () => ({ baseUrl, authHeaders }),
            commentMapper: ddpCommentMapper,
          },
          registry,
          logger
        )
      }
      return new ManifestProviderService(
        {
          manifestId: 'builtin:dandanplay',
          provider: DanmakuSourceType.DanDanPlay,
          providerConfigId: config.id,
          commentMapper: ddpCommentMapper,
        },
        registry,
        logger
      )
    }
    case DanmakuSourceType.Bilibili:
      return new ManifestProviderService(
        {
          manifestId: 'builtin:bilibili',
          provider: DanmakuSourceType.Bilibili,
          providerConfigId: PROVIDER_TO_BUILTIN_ID.Bilibili,
          commentMapper: withMapper(BilibiliMapper.manifestSegmentsToComments),
          extraInputs: () => ({
            danmakuFormat: config.options.danmakuTypePreference,
          }),
        },
        registry,
        logger
      )
    case DanmakuSourceType.Tencent:
      return new ManifestProviderService(
        {
          manifestId: 'builtin:tencent',
          provider: DanmakuSourceType.Tencent,
          providerConfigId: PROVIDER_TO_BUILTIN_ID.Tencent,
          commentMapper: withMapper(TencentMapper.manifestBarrageToComments),
        },
        registry,
        logger
      )
    case DanmakuSourceType.MacCMS:
      return new MacCmsProviderService(config, logger)
  }
}

export function danmakuProviderFactory(
  context: ResolutionContext
): IDanmakuProviderFactory {
  return (config: ProviderConfig): IDanmakuProvider => {
    return createDanmakuProvider(config, context.get<ILogger>(LoggerSymbol))
  }
}
