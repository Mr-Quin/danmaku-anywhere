import { CommentMode, hexToRgb888 } from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'

const tencentApiResponseBaseSchema = z.object({
  ret: z.number(),
  msg: z.string(),
})

export type TencentApiResponseBase = z.infer<
  typeof tencentApiResponseBaseSchema
>

const tencentSearchMediaSchema = z.object({
  normalList: z.object({
    itemList: z.array(
      z.object({
        doc: z.object({
          dataType: z.number(),
          id: z.string(),
        }),
        videoInfo: z
          .object({
            videoType: z.number(),
            typeName: z.string(),
            title: z.string(),
            year: z.number().optional(),
          })
          .optional(),
      })
    ),
  }),
})

export const tencentSearchResponseSchema = tencentApiResponseBaseSchema.extend({
  data: z
    .object({
      result: z.array(tencentSearchMediaSchema).optional().default([]),
    })
    .optional(),
})

type TencentSearchResponse = z.infer<typeof tencentSearchResponseSchema>

export type TencentSearchResult = NonNullable<
  TencentSearchResponse['data']
>['result']

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
  pageParams: {
    // media id
    cid: string
    lid: string // numeric string
    req_from: string
    page_type: string
    page_id: string
    id_type: string // numeric string
    page_size: string // numeric string
    page_context: string // provided by the api
  }
  has_cache: number
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
