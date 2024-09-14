export enum DanmakuSourceType {
  Custom,
  DanDanPlay,
  Bilibili,
  Tencent,
}

export type RemoteDanmakuSourceType = Exclude<
  DanmakuSourceType,
  DanmakuSourceType.Custom
>

export const danmakuSourceTypeList = Object.values(DanmakuSourceType).filter(
  (e): e is DanmakuSourceType => typeof e === 'number'
)

export function localizedDanmakuSourceType(type: DanmakuSourceType): string {
  switch (type) {
    case DanmakuSourceType.Custom:
      return 'danmaku.type.Custom'
    case DanmakuSourceType.DanDanPlay:
      return 'danmaku.type.DanDanPlay'
    case DanmakuSourceType.Bilibili:
      return 'danmaku.type.Bilibili'
    case DanmakuSourceType.Tencent:
      return 'danmaku.type.Tencent'
  }
}

export enum IntegrationType {
  None,
  Plex,
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

export const getIntegrationLabel = (type: IntegrationType) =>
  IntegrationType[type]

export const integrationTypeList = Object.values(IntegrationType).filter(
  (e): e is IntegrationType => typeof e === 'number'
)

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
