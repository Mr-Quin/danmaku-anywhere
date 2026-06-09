import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type {
  ManifestTestDanmakuInput,
  ManifestTestEpisodesInput,
  ManifestTestSearchInput,
} from '@/common/rpcClient/background/types'

export const useManifestSource = (manifestId?: string) => {
  return useQuery({
    enabled: manifestId !== undefined,
    queryFn: () =>
      chromeRpcClient.providerGetManifestSource({
        manifestId: manifestId as string,
      }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestSource(manifestId ?? ''),
    refetchOnWindowFocus: false,
  })
}

export const useSaveUserManifest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      manifest: unknown
      mode: 'create' | 'update'
      expectedId?: string
    }) => chromeRpcClient.providerSaveUserManifest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.manifestList(),
      })
    },
  })
}

export const useManifestTestRun = () => {
  const search = useMutation({
    mutationFn: async (input: ManifestTestSearchInput) =>
      (await chromeRpcClient.providerTestRunSearch(input)).data,
  })
  const episodes = useMutation({
    mutationFn: async (input: ManifestTestEpisodesInput) =>
      (await chromeRpcClient.providerTestRunEpisodes(input)).data,
  })
  const danmaku = useMutation({
    mutationFn: async (input: ManifestTestDanmakuInput) =>
      (await chromeRpcClient.providerTestRunDanmaku(input)).data,
  })
  return { search, episodes, danmaku }
}
