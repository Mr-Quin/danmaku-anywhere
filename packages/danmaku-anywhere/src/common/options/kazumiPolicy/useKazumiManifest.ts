import {
  KAZUMI_RULES_BASE_URL,
  type KazumiPolicyManifest,
} from '@/common/options/kazumiPolicy/schema'
import { kazumiPolicyService } from '@/common/options/kazumiPolicy/service'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

export const useKazumiManifest = () => {
  return useQuery({
    queryKey: kazumiQueryKeys.policyManifest(),
    queryFn: async () => {
      const res = await fetch(`${KAZUMI_RULES_BASE_URL}/index.json`)
      return (await res.json()) as KazumiPolicyManifest[]
    },
  })
}

export const useKazumiPolicies = () => {
  return useSuspenseQuery({
    queryKey: kazumiQueryKeys.policies(),
    queryFn: async () => {
      return kazumiPolicyService.getAll()
    },
  })
}
