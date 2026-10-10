import { z } from 'zod'

const zFilter = z.looseObject({
  type: z.enum(['text', 'regex']),
  value: z.string(),
  enabled: z.boolean(),
})

const zFixedCommentMode = z.enum(['normal', 'hidden', 'scroll'])

// Objects are loose because stored options carry fields that were dropped from
// the type without a migration removing them, and those are harmless.
export const danmakuOptionsSchema = z.looseObject({
  style: z.looseObject({
    opacity: z.number(),
    fontSize: z.number(),
    fontFamily: z.string(),
  }),
  trackHeight: z.number(),
  allowOverlap: z.boolean(),
  // Added to the defaults without a migration, so options saved before then
  // do not have it.
  overlap: z.number().optional(),
  filters: z.array(zFilter),
  distribution: z.enum(['random', 'order']),
  maxOnScreen: z.number(),
  interval: z.number(),
  speed: z.number(),
  area: z.looseObject({
    yStart: z.number(),
    yEnd: z.number(),
    xStart: z.number(),
    xEnd: z.number(),
  }),
  trackLimit: z.number(),
  offset: z.number(),
  collapse: z.looseObject({
    dedupe: z.looseObject({
      enabled: z.boolean(),
      windowMs: z.number(),
      maxDedupe: z.number(),
    }),
    pattern: z.looseObject({
      enabled: z.boolean(),
      autoCollapse: z.boolean(),
      minCount: z.number(),
      liveCount: z.boolean(),
      pulse: z.boolean(),
      patterns: z.array(zFilter.extend({ label: z.string() })),
    }),
    whiteList: z.array(zFilter),
  }),
  specialComments: z.looseObject({
    top: zFixedCommentMode,
    bottom: zFixedCommentMode,
  }),
  customCss: z.string(),
  useCustomCss: z.boolean(),
  occlusion: z.boolean(),
  occlusionModel: z.string(),
  occlusionConfidence: z.number(),
  occlusionEdgeSoftness: z.number(),
  occlusionQuality: z.enum(['low', 'medium', 'high']),
})
