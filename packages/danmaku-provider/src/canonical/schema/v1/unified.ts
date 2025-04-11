import { z } from 'zod'
import { zBiliEpisode, zBiliSeason } from './bilibili.js'
import { zDanDanEpisode, zDanDanSeason } from './ddp.js'
import { zTencentEpisode, zTencentSeason } from './tencent.js'

export const zSeason = z.discriminatedUnion('provider', [
  zDanDanSeason,
  zBiliSeason,
  zTencentSeason,
])

export const zEpisode = z.discriminatedUnion('provider', [
  zDanDanEpisode,
  zBiliEpisode,
  zTencentEpisode,
])

export type Season = z.infer<typeof zSeason>
export type Episode = z.infer<typeof zEpisode>
