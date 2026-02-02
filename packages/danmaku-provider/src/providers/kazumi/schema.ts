import { z } from 'zod'

export const zKazumaManifest = z.object({
  name: z.string(),
  version: z.string(),
  useNativePlayer: z.boolean(),
  author: z.string(),
  lastUpdate: z.number(),
})

export type KazumaManifest = z.output<typeof zKazumaManifest>

export const zKazumiPolicy = z.object({
  api: z.string(),
  type: z.string(),
  name: z.string().min(1),
  version: z.string(),
  muliSources: z.boolean().optional().prefault(false),
  useWebview: z.boolean().optional().prefault(false),
  useNativePlayer: z.boolean().optional().prefault(false),
  usePost: z.boolean().optional().prefault(false),
  useLegacyParser: z.boolean().optional().prefault(false),
  userAgent: z.string().optional().prefault(''),
  baseURL: z.string().min(1),
  searchURL: z.string().min(1),
  searchList: z.string().min(1),
  searchName: z.string().min(1),
  searchResult: z.string().min(1),
  chapterRoads: z.string().min(1),
  chapterResult: z.string().min(1),
  referer: z.string().optional().prefault(''),
})

export type KazumiPolicy = z.output<typeof zKazumiPolicy>
