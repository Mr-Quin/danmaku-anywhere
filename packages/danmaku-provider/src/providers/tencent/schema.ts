import { CommentMode, hexToRgb888 } from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'

const zTencentApiResponseBase = z.object({
  ret: z.number(),
  msg: z.string(),
})

export type TencentApiResponseBase = z.infer<typeof zTencentApiResponseBase>

const zTencentVideoSeason = z.object({
  doc: z.object({
    dataType: z.number(),
    id: z.string(),
  }),
  videoInfo: z.object({
    videoType: z.number(),
    typeName: z.string(),
    title: z.string(),
    year: z.number().optional().prefault(0), // year of release, null or 0 for non-seasonal
    imgUrl: z.url(),
    episodeSites: z.array(
      z.object({
        showName: z.string(),
        totalEpisode: z.number(),
      })
    ),
  }),
})

function transformItemList(items: unknown[]) {
  return items
    .filter(
      (item): item is TencentVideoSeason =>
        zTencentVideoSeason.safeParse(item).success
    )
    .filter((item) => {
      return item.videoInfo.year !== 0 && item.videoInfo.episodeSites.length > 0
    })
}

export type TencentVideoSeason = z.infer<typeof zTencentVideoSeason>

export const zTencentSearchResponse = zTencentApiResponseBase.extend({
  data: z
    .object({
      areaBoxList: z.array(
        z.object({
          boxId: z.string(),
          itemList: z.array(z.any()).transform(transformItemList),
        })
      ),
      normalList: z.object({
        itemList: z.array(z.any()).transform(transformItemList),
      }),
    })
    .optional(),
})

export type TencentSearchResult = TencentVideoSeason[]

export interface TencentSearchParams {
  query: string
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

const zTencentEpisodeListItem = z.object({
  vid: z.string(),
  cid: z.string(), // cid of the media, same as the cid in the request
  is_trailer: z.string(), // "0" or "1"
  play_title: z.string(),
  title: z.string(),
  union_title: z.string(),
  image_url: z.url(),
})

export const zTencentEpisodeListResponse = zTencentApiResponseBase.extend({
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
                      item_params: zTencentEpisodeListItem,
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

export type TencentEpisodeListItem = z.infer<typeof zTencentEpisodeListItem>

export const zTencentPageDetailResponse = zTencentApiResponseBase.extend({
  data: z
    .object({
      has_next_page: z.boolean(),
      module_list_datas: z.array(
        z.object({
          module_datas: z.array(
            z.object({
              module_id: z.string(),
              item_data_lists: z.object({
                item_datas: z.array(
                  z.object({
                    item_type: z.string(),
                    item_params: z.object({
                      title: z.string(),
                      new_pic_vt: z.url(),
                      new_pic_hz: z.url(),
                      'report.cid': z.string(),
                      episode_all: z.coerce.number(),
                      year: z.coerce.number(),
                    }),
                  })
                ),
              }),
            })
          ),
        })
      ),
    })
    .optional(),
})

export type TencentPageDetailResponse = z.infer<
  typeof zTencentPageDetailResponse
>

export const zTencentCommentSegment = z.object({
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

export type TencentCommentSegmentData = z.infer<typeof zTencentCommentSegment>

const zCommentStyle = z.object({
  color: z.string(), // color in hex, without #
  gradient_colors: z.tuple([z.string(), z.string()]),
  position: z.number(),
})

export const zTencentComment = z.object({
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
            return zCommentStyle.parse(json)
          } catch {
            return undefined
          }
        }),
      })
      .transform((data) => {
        const hexString =
          data.content_style?.gradient_colors[0] ?? // we can't display gradient color, so use the first color
          data.content_style?.color ??
          'ffffff'

        const color = hexToRgb888(`#${hexString}`)

        return {
          p: `${data.time_offset / 1000},${CommentMode.rtl},${color}`,
          m: data.content,
        }
      })
  ),
})
