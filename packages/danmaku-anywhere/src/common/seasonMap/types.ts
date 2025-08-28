/**
 * Maps a key to a seasonId, where the key is generated from website-specific information
 */
export interface SeasonMap {
  key: string
  DanDanPlay?: number
  Bilibili?: number
  Tencent?: number
  iQiyi?: number
}
