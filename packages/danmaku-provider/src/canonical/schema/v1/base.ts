import { z } from 'zod'

export enum DanmakuSourceType {
  Custom = 'Custom',
  DanDanPlay = 'DanDanPlay',
  Bilibili = 'Bilibili',
  Tencent = 'Tencent',
}

export const zBaseSeason = z.object({
  title: z.string(),
  type: z.string(),
  imageUrl: z.string().url().optional(),
  alternativeTitles: z.array(z.string()).optional(),
})

export const zBaseEpisode = z.object({
  title: z.string(),
  episodeNumber: z.union([z.string(), z.number()]).optional(),
  imageUrl: z.string().url().optional(),
  seasonProvider: z.nativeEnum(DanmakuSourceType),
})
