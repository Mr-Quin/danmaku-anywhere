import { z } from 'zod'

export const zKazumaManifest = z.object({
  name: z.string(),
  version: z.string(),
  useNativePlayer: z.boolean(),
  author: z.string(),
  lastUpdate: z.number(),
})

export type KazumaManifest = z.output<typeof zKazumaManifest>

export const zKazumiPolicy = z.looseObject({
  api: z.string(),
  type: z.string(),
  name: z.string().min(1),
  version: z.string(),
  muliSources: z.boolean().prefault(false),
  useWebview: z.boolean().prefault(false),
  useNativePlayer: z.boolean().prefault(false),
  usePost: z.boolean().prefault(false),
  useLegacyParser: z.boolean().prefault(false),
  userAgent: z.string().prefault(''),
  baseURL: z.string().min(1),
  searchURL: z.string().prefault(''),
  searchList: z.string().prefault(''),
  searchName: z.string().prefault(''),
  searchResult: z.string().prefault(''),
  chapterRoads: z.string().prefault(''),
  chapterResult: z.string().prefault(''),
  referer: z.string().prefault(''),
})

export type KazumiPolicy = z.output<typeof zKazumiPolicy>
