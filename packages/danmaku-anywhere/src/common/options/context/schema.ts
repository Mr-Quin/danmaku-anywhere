import { z } from 'zod'
import type { Options } from '@/common/options/OptionsService/types'

/**
 * Provider context - stores which provider instance is currently being used
 * This is set when a search/fetch operation is initiated and read by services
 */
export const providerContextSchema = z.object({
  /**
   * ID of the provider instance currently in use
   * For built-in providers: 'builtin-dandanplay', 'builtin-bilibili', 'builtin-tencent'
   * For custom providers: UUID string
   */
  providerId: z.string().optional(),
  
  /**
   * Provider type for quick access
   */
  providerType: z.enum([
    'builtin-dandanplay',
    'builtin-bilibili', 
    'builtin-tencent',
    'custom-dandanplay',
    'custom-maccms',
  ]).optional(),
})

export type ProviderContext = z.infer<typeof providerContextSchema>

export type ProviderContextOptions = Options<ProviderContext>
