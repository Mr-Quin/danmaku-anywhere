export enum DanmakuSourceType {
  Custom,
  DDP,
  Bilibili,
}

export const danmakuSourceTypeList = Object.values(DanmakuSourceType).filter(
  (e): e is DanmakuSourceType => typeof e === 'number'
)

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
