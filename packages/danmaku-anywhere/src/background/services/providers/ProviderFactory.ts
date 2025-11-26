import type { ResolutionContext } from 'inversify'
import type { IDanmakuProvider } from '@/background/services/providers/IDanmakuProvider'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { BilibiliService } from './bilibili/BilibiliService'
import { DanDanPlayService } from './dandanplay/DanDanPlayService'
import { MacCmsProviderService } from './MacCmsProviderService'
import { TencentService } from './tencent/TencentService'

interface ServiceMap {
  [DanmakuSourceType.DanDanPlay]: DanDanPlayService
  [DanmakuSourceType.Bilibili]: BilibiliService
  [DanmakuSourceType.Tencent]: TencentService
  [DanmakuSourceType.MacCMS]: MacCmsProviderService
}

export interface IDanmakuProviderFactory {
  (config: ProviderConfig): IDanmakuProvider
  getTyped(config: ProviderConfig): ServiceMap[ProviderConfig['impl']]
}

export const DanmakuProviderFactory = Symbol.for('DanmakuProviderFactory')

function createDanmakuProvider(
  config: ProviderConfig
): ServiceMap[ProviderConfig['impl']] {
  switch (config.impl) {
    case DanmakuSourceType.DanDanPlay:
      return new DanDanPlayService(config)
    case DanmakuSourceType.Bilibili:
      return new BilibiliService(config)
    case DanmakuSourceType.Tencent:
      return new TencentService(config)
    case DanmakuSourceType.MacCMS:
      return new MacCmsProviderService(config)
  }
}

export function danmakuProviderFactory(
  context: ResolutionContext
): IDanmakuProviderFactory {
  function get(config: ProviderConfig): IDanmakuProvider {
    return createDanmakuProvider(config) as IDanmakuProvider
  }
  get.getTyped = (config: ProviderConfig) => createDanmakuProvider(config)
  return get
}
