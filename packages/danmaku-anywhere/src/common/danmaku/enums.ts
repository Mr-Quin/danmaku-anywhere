export enum DanmakuSourceType {
  Custom = 'Custom',
  DanDanPlay = 'DanDanPlay',
  Bilibili = 'Bilibili',
  Tencent = 'Tencent',
}

export type RemoteDanmakuSourceType = Exclude<
  DanmakuSourceType,
  DanmakuSourceType.Custom
>

export const danmakuSourceTypeList: DanmakuSourceType[] = [
  DanmakuSourceType.Custom,
  DanmakuSourceType.DanDanPlay,
  DanmakuSourceType.Bilibili,
  DanmakuSourceType.Tencent,
]

export function localizedDanmakuSourceType(type: DanmakuSourceType): string {
  return `danmaku.type.${type}`
}

export const hasIntegration = (policy: string | undefined): policy is string =>
  typeof policy === 'string'
