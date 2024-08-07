export enum DanmakuSourceType {
  Custom,
  DDP,
}

export const danmakuSourceTypeList = Object.values(DanmakuSourceType).filter(
  (e): e is DanmakuSourceType => typeof e === 'number'
)

export enum IntegrationType {
  None,
  Plex,
}

export const hasIntegration = (type: IntegrationType) =>
  type !== IntegrationType.None

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
