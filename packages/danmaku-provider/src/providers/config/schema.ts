import { z } from 'zod'

export const zConfigResponse = z.object({
  baseUrls: z.array(z.string()),
})

export type ConfigResponse = z.infer<typeof zConfigResponse>
