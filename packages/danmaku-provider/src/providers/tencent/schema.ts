import { CommentMode, hexToRgb888 } from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'

const tencentApiResponseBaseSchema = z.object({
  ret: z.number(),
  msg: z.string(),
})

export type TencentApiResponseBase = z.infer<
  typeof tencentApiResponseBaseSchema
>

const tencentVideoSeasonSchema = z.object({
  doc: z.object({
    dataType: z.number(),
    id: z.string(),
  }),
  videoInfo: z.object({
    videoType: z.number(),
    typeName: z.string(),
    title: z.string(),
    year: z.number().optional().default(0), // year of release, null or 0 for non-seasonal
  }),
})

export const tencentSearchResponseSchema = tencentApiResponseBaseSchema.extend({
  data: z
    .object({
      normalList: z.object({
        itemList: z.array(tencentVideoSeasonSchema).transform((items) => {
          // remove items without year
          return items.filter((item) => item.videoInfo.year !== 0)
        }),
      }),
    })
    .optional(),
})

type TencentSearchResponse = z.infer<typeof tencentSearchResponseSchema>

export type TencentSearchResult = NonNullable<
  TencentSearchResponse['data']
>['normalList']['itemList']

export interface TencentSearchParams {
  version?: string
  filterValue?: string
  retry?: number
  // search keyword
  query: string
  pagesize?: number
  pagenum?: number
  queryFrom?: number
  isneedQc?: boolean
  adRequestInfo?: string
  sdkRequestInfo?: string
  sceneId?: number
  platform?: string
}

export interface TencentEpisodeListParams {
  // all fields of pageParams need to be converted to string before sending
  cid: string // media id
  vid?: string // video id
  lid?: number
  req_from?: string
  page_type?: string
  page_id?: string
  id_type?: number
  page_size?: number
  page_context?: string // for pagination
}

const tencentEpisodeListItemSchema = z.object({
  vid: z.string(),
  cid: z.string(), // cid of the media, same as the cid in the request
  is_trailer: z.string(), // "0" or "1"
  play_title: z.string(),
  title: z.string(),
  union_title: z.string(),
})

export const tencentEpisodeListResponseSchema =
  tencentApiResponseBaseSchema.extend({
    data: z
      .object({
        has_next_page: z.boolean(),
        module_list_datas: z.array(
          z.object({
            module_datas: z.array(
              z.object({
                module_id: z.string(),
                item_data_lists: z.object({
                  item_datas: z
                    .array(
                      z.object({
                        item_id: z.string(),
                        item_params: tencentEpisodeListItemSchema,
                      })
                    )
                    .transform((items) => {
                      return items.filter(
                        // filter out trailers
                        (item) => item.item_params.is_trailer !== '1'
                      )
                    }),
                }),
              })
            ),
          })
        ),
      })
      .optional(),
  })

export type TencentEpisodeListItem = z.infer<
  typeof tencentEpisodeListItemSchema
>

export const tencentCommentSegmentSchema = z.object({
  segment_start: z.coerce.number(),
  segment_span: z.coerce.number(),
  segment_index: z.record(
    z.coerce.number(),
    z.object({
      segment_start: z.coerce.number(),
      segment_name: z.string(),
    })
  ),
})

export type TencentCommentSegmentData = z.infer<
  typeof tencentCommentSegmentSchema
>

const commentStyleSchema = z.object({
  color: z.string(), // color in hex
  gradient_color: z.tuple([z.string(), z.string()]),
  position: z.number(),
})

export const tencentCommentSchema = z.object({
  barrage_list: z.array(
    z
      .object({
        id: z.string(),
        content: z.string(), // comment content
        time_offset: z.coerce.number(), // time in milliseconds
        content_score: z.number(),
        // stringified json
        content_style: z.string().transform((str) => {
          try {
            const json = JSON.parse(str)
            return commentStyleSchema.parse(json)
          } catch {
            return undefined
          }
        }),
      })
      .transform((data) => {
        const color = hexToRgb888(data.content_style?.color ?? '#ffffff')

        return {
          p: `${data.time_offset / 1000},${CommentMode.rtl},${color}`,
          m: data.content,
        }
      })
  ),
})
