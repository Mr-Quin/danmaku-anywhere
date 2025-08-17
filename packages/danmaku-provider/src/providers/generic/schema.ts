import { z } from 'zod'

export const zVodItem = z.object({
  vod_id: z.union([z.string(), z.number()]),
  vod_name: z.string(),
  vod_pic: z.string().optional().nullable(),
  vod_year: z.string().optional().nullable(),
  vod_area: z.string().optional().nullable(),
  vod_class: z.string().optional().nullable(),
  vod_play_from: z.string().optional().nullable().default(''),
  vod_play_url: z.string(),
})

export const zVodSearchResponse = z.object({
  code: z.number(),
  msg: z.string().optional(),
  page: z.number().optional(),
  pagecount: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional(),
  list: z.array(zVodItem).default([]),
})

export type VodItem = z.output<typeof zVodItem>
export type VodSearchResponse = z.output<typeof zVodSearchResponse>

export type ParsedPlayUrl = {
  source: string
  episodeNumber: number
  url: string
}
