import { z } from 'zod'

export const zConfigResponse = z.object({
  baseUrl: z.array(z.string()),
})

export type ConfigResponse = z.infer<typeof zConfigResponse>
