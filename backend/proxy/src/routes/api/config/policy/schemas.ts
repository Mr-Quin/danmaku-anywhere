import { zIntegrationPolicy } from '@danmaku-anywhere/integration-policy'
import { z } from 'zod'

export const zDomain = z
  .string()
  .trim()
  .min(1)
  .transform((s) => {
    try {
      const url = new URL(s)
      return url.hostname
    } catch {
      return s
    }
  })
  .refine(
    (s) => {
      try {
        new URL(`https://${s}`)
        return true
      } catch {
        return false
      }
    },
    {
      error: 'Invalid domain',
    }
  )

export const uploadSchema = z.object({
  name: z.string().min(1).trim(),
  config: zIntegrationPolicy,
  domains: z.array(zDomain).optional().prefault([]),
  tags: z.array(z.string().min(1).trim()).optional().prefault([]),
  authorId: z.string().trim().optional(),
  authorName: z.string().trim().optional(),
})

export const listQuerySchema = z.object({
  keyword: z.string().optional(),
  domain: zDomain.optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).prefault(1),
  limit: z.coerce.number().int().min(1).max(100).prefault(10),
})
