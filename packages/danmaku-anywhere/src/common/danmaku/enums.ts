import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { i18n } from '../localization/i18n'
import { createLocalizationMap } from '../utils/createLocalizationMap'

export { DanmakuSourceType, type RemoteDanmakuSourceType }

export const danmakuSourceTypeList: DanmakuSourceType[] = [
  DanmakuSourceType.MacCMS,
  DanmakuSourceType.DanDanPlay,
  DanmakuSourceType.Bilibili,
  DanmakuSourceType.Tencent,
  DanmakuSourceType.Youku,
  DanmakuSourceType.Mango,
  DanmakuSourceType.Iqiyi,
  DanmakuSourceType.Sohu,
  DanmakuSourceType.Maiduidui,
  DanmakuSourceType.Renren,
]

const DANMAKU_SOURCE_TYPE_LABEL = createLocalizationMap<DanmakuSourceType>({
  [DanmakuSourceType.MacCMS]: () => i18n.t('danmaku.type.macCms', 'MacCMS'),
  [DanmakuSourceType.DanDanPlay]: () =>
    i18n.t('danmaku.type.danDanPlay', 'DanDanPlay'),
  [DanmakuSourceType.Bilibili]: () =>
    i18n.t('danmaku.type.bilibili', 'Bilibili'),
  [DanmakuSourceType.Tencent]: () => i18n.t('danmaku.type.tencent', 'Tencent'),
  [DanmakuSourceType.Youku]: () => i18n.t('danmaku.type.youku', 'Youku'),
  [DanmakuSourceType.Mango]: () => i18n.t('danmaku.type.mango', 'Mango TV'),
  [DanmakuSourceType.Iqiyi]: () => i18n.t('danmaku.type.iqiyi', 'iQIYI'),
  [DanmakuSourceType.Sohu]: () => i18n.t('danmaku.type.sohu', 'Sohu'),
  [DanmakuSourceType.Maiduidui]: () =>
    i18n.t('danmaku.type.maiduidui', 'Maiduidui'),
  [DanmakuSourceType.Renren]: () => i18n.t('danmaku.type.renren', 'Renren'),
})

export function localizedDanmakuSourceType(type: DanmakuSourceType): string {
  return DANMAKU_SOURCE_TYPE_LABEL[type]()
}
