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

export enum IntegrationType {
  None = 'None',
  Plex = 'Plex',
}

export type IntegrationTypeNotNone = Exclude<
  IntegrationType,
  IntegrationType.None
>

export function assertHasIntegration(
  type: IntegrationType
): asserts type is IntegrationTypeNotNone {
  if (type === IntegrationType.None) {
    throw new Error('IntegrationType.None is not allowed')
  }
}

export const hasIntegration = (
  type: IntegrationType
): type is IntegrationTypeNotNone => type !== IntegrationType.None

export const IntegrationList = [
  {
    value: IntegrationType.None,
    label: 'integration.type.None',
  },
  {
    value: IntegrationType.Plex,
    label: 'integration.type.Plex',
  },
]
