import { z } from 'zod'
import { DanDanChConvert } from '../../../utils/index.js'
import { zCommentImport } from '../../comment/index.js'

const zBaseEpisodeV1 = z.object({
  type: z.union([
    z.literal(1), // dandanplay
    z.literal(0), // custom
  ]),
  comments: z.array(zCommentImport),
  version: z.number(),
  timeUpdated: z.number(),
  schemaVersion: z.literal(1).optional().prefault(1), // Does not exist in schema, but we can default it to 1
})

const schema = {
  dandanPlay: z.discriminatedUnion('type', [
    zBaseEpisodeV1.extend({
      type: z.literal(1), // dandanplay
      params: z.object({
        chConvert: z.enum(DanDanChConvert).optional(),
        withRelated: z.boolean().optional(),
        from: z.number().optional(),
      }),
      meta: z.object({
        type: z.literal(1),
        episodeId: z.number(),
        animeId: z.number(),
        episodeTitle: z.string().optional(),
        animeTitle: z.string(),
      }),
    }),
  ]),
  custom: z.discriminatedUnion('type', [
    zBaseEpisodeV1.extend({
      type: z.literal(0), // custom
      meta: z
        .object({
          type: z.literal(0),
          animeTitle: z.string(),
          episodeTitle: z.string().optional(),
          episodeNumber: z.number().optional(),
        })
        .refine((data) => {
          return (
            data.episodeTitle !== undefined || data.episodeNumber !== undefined
          )
        }, 'One of episodeTitle or episodeNumber is required'),
    }),
  ]),
}

export const zEpisodeImportV1 = z.discriminatedUnion('type', [
  ...schema.dandanPlay.options,
  ...schema.custom.options,
])
