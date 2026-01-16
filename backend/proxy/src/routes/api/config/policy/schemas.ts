import { zIntegrationPolicy } from '@danmaku-anywhere/integration-policy'
import { z } from 'zod'

export const uploadSchema = z.object({
  name: z.string().min(1).trim(),
  config: zIntegrationPolicy,
  domains: z
    .array(z.string().refine((d) => d.length > 0))
    .optional()
    .default([]),
  tags: z.array(z.string().min(1).trim()).optional().default([]),
  authorId: z.string().trim().optional(),
  authorName: z.string().trim().optional(),
})

export const listQuerySchema = z.object({
  keyword: z.string().optional(),
  domain: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})
