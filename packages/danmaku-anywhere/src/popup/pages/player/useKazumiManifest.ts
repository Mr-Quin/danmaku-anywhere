import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'

const KAZUMI_RULES_BASE_URL =
  'https://raw.githubusercontent.com/Predidit/KazumiRules/main'

export type KazumiPolicyManifest = {
  name: string
  version: string
  useNativePlayer: boolean
  author: string
  lastUpdate: number
}

const zKazumiPolicy = z.object({
  api: z.string(),
  type: z.string(),
  name: z.string().min(1),
  version: z.string(),
  muliSources: z.boolean().optional().default(false),
  useWebview: z.boolean().optional().default(false),
  useNativePlayer: z.boolean().optional().default(false),
  usePost: z.boolean().optional().default(false),
  useLegacyParser: z.boolean().optional().default(false),
  userAgent: z.string().optional().default(''),
  baseURL: z.string().min(1),
  searchURL: z.string().min(1),
  searchList: z.string().min(1),
  searchName: z.string().min(1),
  searchResult: z.string().min(1),
  chapterRoads: z.string().min(1),
  chapterResult: z.string().min(1),
  referer: z.string().optional().default(''),
})

export type KazumiPolicy = z.output<typeof zKazumiPolicy>

export const useKazumiManifest = () => {
  return useSuspenseQuery({
    queryKey: kazumiQueryKeys.policyManifest(),
    queryFn: async () => {
      const res = await fetch(`${KAZUMI_RULES_BASE_URL}/index.json`)
      return (await res.json()) as KazumiPolicyManifest[]
    },
  })
}

export const useKazumiPolicy = (name?: string) => {
  return useQuery({
    queryKey: kazumiQueryKeys.policy(name),
    queryFn: async () => {
      const res = await fetch(`${KAZUMI_RULES_BASE_URL}/${name}.json`)
      return zKazumiPolicy.parse(await res.json())
    },
    enabled: !!name,
  })
}
