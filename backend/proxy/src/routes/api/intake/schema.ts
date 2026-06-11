import { z } from 'zod'

export const SURFACES = ['popup', 'content', 'player', 'background'] as const

export const MAX_BATCH_LENGTH = 50
export const MAX_EVENT_BYTES = 4 * 1024
export const MAX_PAYLOAD_BYTES = 64 * 1024

const eventSchema = z.object({
  installId: z.string().min(1).max(64),
  event: z.string().min(1).max(64),
  properties: z.record(z.string(), z.unknown()).default({}),
  clientTs: z.number(),
  version: z.string().max(32),
  environment: z.string().max(16),
  surface: z.enum(SURFACES),
})

export const intakeBatchSchema = z
  .array(eventSchema)
  .min(1)
  .max(MAX_BATCH_LENGTH)
