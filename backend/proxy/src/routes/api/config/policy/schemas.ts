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

export const policyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: zIntegrationPolicy,
  authorId: z.string().nullable(),
  domains: z.array(z.string()).nullable(),
  tags: z.array(z.string()).nullable(),
  isPublic: z.boolean().nullable(),
  downloads: z.number().nullable(),
  upvotes: z.number().nullable(),
  downvotes: z.number().nullable(),
  createdAt: z.iso.datetime(),
})

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const listResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(policyResponseSchema),
  pagination: paginationSchema,
})

export const createResponseSchema = z.object({
  success: z.boolean(),
  configId: z.string(),
})

export const successResponseSchema = z.object({
  success: z.boolean(),
})
