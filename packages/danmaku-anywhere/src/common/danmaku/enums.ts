import {
  DanmakuSourceType,
  type RemoteDanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'

export { DanmakuSourceType, type RemoteDanmakuSourceType }

export const danmakuSourceTypeList: DanmakuSourceType[] = [
  DanmakuSourceType.MacCMS,
  DanmakuSourceType.DanDanPlay,
  DanmakuSourceType.Bilibili,
  DanmakuSourceType.Tencent,
]

export function localizedDanmakuSourceType(type: DanmakuSourceType): string {
  return `danmaku.type.${type}`
}
