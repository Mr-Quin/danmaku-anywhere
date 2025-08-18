import { z } from 'zod'
import { parseMacCmsPlayUrl } from './parseMacCmsPlayUrl.js'

const zVodItemBase = z.object({
  vod_id: z.union([z.string(), z.number()]),
  vod_name: z.string(),
  vod_pic: z.string().optional().nullable(),
  vod_year: z.string().optional().nullable(),
  vod_area: z.string().optional().nullable(),
  vod_class: z.string().optional().nullable(),
  vod_play_from: z.string().optional().nullable().default(''),
  vod_play_url: z.string(),
})

export const zVodItem = zVodItemBase.transform((item) => {
  const parsedPlayUrls = parseMacCmsPlayUrl(
    item.vod_name,
    item.vod_play_from ?? '',
    item.vod_play_url ?? ''
  )

  return {
    ...item,
    parsedPlayUrls,
  }
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

export type GenericVodItem = z.output<typeof zVodItem>
export type GenericVodSearchResponse = z.output<typeof zVodSearchResponse>
export type { MacCmsParsedPlayUrl } from './parseMacCmsPlayUrl.js'
