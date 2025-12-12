import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { i18n } from '../localization/i18n'

export { DanmakuSourceType, type RemoteDanmakuSourceType }

export const danmakuSourceTypeList: DanmakuSourceType[] = [
  DanmakuSourceType.MacCMS,
  DanmakuSourceType.DanDanPlay,
  DanmakuSourceType.Bilibili,
  DanmakuSourceType.Tencent,
]

export const DANMAKU_SOURCE_TYPE_LABEL: Record<
  DanmakuSourceType,
  () => string
> = {
  [DanmakuSourceType.MacCMS]: () => i18n.t('danmaku.type.macCms', 'MacCMS'),
  [DanmakuSourceType.DanDanPlay]: () =>
    i18n.t('danmaku.type.danDanPlay', 'DanDanPlay'),
  [DanmakuSourceType.Bilibili]: () =>
    i18n.t('danmaku.type.bilibili', 'Bilibili'),
  [DanmakuSourceType.Tencent]: () => i18n.t('danmaku.type.tencent', 'Tencent'),
}

export function localizedDanmakuSourceType(type: DanmakuSourceType): string {
  return DANMAKU_SOURCE_TYPE_LABEL[type]()
}
