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

type ManifestSourceResponse = Awaited<
  ReturnType<typeof chromeRpcClient.providerGetManifestSource>
>

function manifestIdOf(manifest: unknown): string | undefined {
  if (typeof manifest !== 'object' || manifest === null) {
    return undefined
  }
  if (!('id' in manifest) || typeof manifest.id !== 'string') {
    return undefined
  }
  return manifest.id
}

// The background announces the save too, but that can arrive after the
// editor has reopened from the cache, which would seed it with pre-save JSON.
export const useSaveUserManifest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      manifest: unknown
      mode: 'create' | 'update'
      expectedId?: string
    }) => chromeRpcClient.providerSaveUserManifest(input),
    onSuccess: (_, { manifest }) => {
      const manifestId = manifestIdOf(manifest)
      if (manifestId === undefined) {
        return
      }
      queryClient.setQueryData<ManifestSourceResponse>(
        sourceQueryKeys.manifestSource(manifestId),
        (cached) => {
          if (!cached) {
            return cached
          }
          return { ...cached, data: { manifest, kind: 'user' } }
        }
      )
    },
  })
}

export const useDeleteUserManifest = () => {
  return useMutation({
    mutationFn: (manifestId: string) =>
      chromeRpcClient.providerDeleteUserManifest({ manifestId }),
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
