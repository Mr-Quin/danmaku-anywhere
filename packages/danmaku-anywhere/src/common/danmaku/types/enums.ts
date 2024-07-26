export enum DanmakuSourceType {
  Custom,
  DDP,
}

export const danmakuSourceTypeList = Object.values(DanmakuSourceType).filter(
  (e): e is DanmakuSourceType => typeof e === 'number'
)
