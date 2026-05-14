import { PROVIDER_TO_BUILTIN_ID } from '@danmaku-anywhere/danmaku-converter'
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
            commentMapper: (raw) =>
              DanDanPlayMapper.manifestCommentsToComments(
                raw as Parameters<
                  typeof DanDanPlayMapper.manifestCommentsToComments
                >[0]
              ),
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
          commentMapper: (raw) =>
            DanDanPlayMapper.manifestCommentsToComments(
              raw as Parameters<
                typeof DanDanPlayMapper.manifestCommentsToComments
              >[0]
            ),
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
          commentMapper: (raw) =>
            BilibiliMapper.manifestSegmentsToComments(
              raw as Parameters<
                typeof BilibiliMapper.manifestSegmentsToComments
              >[0]
            ),
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
          commentMapper: (raw) =>
            TencentMapper.manifestBarrageToComments(
              raw as Parameters<
                typeof TencentMapper.manifestBarrageToComments
              >[0]
            ),
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
