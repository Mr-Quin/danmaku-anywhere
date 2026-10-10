import { z } from 'zod'

const zFilter = z.object({
  type: z.enum(['text', 'regex']),
  value: z.string(),
  enabled: z.boolean(),
})

const zFixedCommentMode = z.enum(['normal', 'hidden', 'scroll'])

export const danmakuOptionsSchema = z.object({
  style: z.object({
    opacity: z.number(),
    fontSize: z.number(),
    fontFamily: z.string(),
  }),
  trackHeight: z.number(),
  allowOverlap: z.boolean(),
  // No migration adds overlap, so options saved before it existed lack it.
  overlap: z.number().optional(),
  filters: z.array(zFilter),
  distribution: z.enum(['random', 'order']),
  maxOnScreen: z.number(),
  interval: z.number(),
  speed: z.number(),
  area: z.object({
    yStart: z.number(),
    yEnd: z.number(),
    xStart: z.number(),
    xEnd: z.number(),
  }),
  trackLimit: z.number(),
  offset: z.number(),
  collapse: z.object({
    dedupe: z.object({
      enabled: z.boolean(),
      windowMs: z.number(),
      maxDedupe: z.number(),
    }),
    pattern: z.object({
      enabled: z.boolean(),
      autoCollapse: z.boolean(),
      minCount: z.number(),
      liveCount: z.boolean(),
      pulse: z.boolean(),
      patterns: z.array(zFilter.extend({ label: z.string() })),
    }),
    whiteList: z.array(zFilter),
  }),
  specialComments: z.object({
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
