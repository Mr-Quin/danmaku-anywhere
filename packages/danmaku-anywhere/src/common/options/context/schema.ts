import { z } from 'zod'
import type { Options } from '@/common/options/OptionsService/types'
import { zProviderConfigType } from '../providerConfig/schema'

export const providerContextSchema = z.object({
  providerId: z.string().optional(),
  providerType: zProviderConfigType.optional(),
})

export type ProviderContext = z.infer<typeof providerContextSchema>

export type ProviderContextOptions = Options<ProviderContext>
