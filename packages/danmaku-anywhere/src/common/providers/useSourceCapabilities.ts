import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { isSourceEpisode } from '@/common/danmaku/utils'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type {
  SourceCapabilityAnswer,
  UrlParseSource,
} from './sourceCapabilities'

// Configs and manifests also change outside this page (sync, the background,
// another extension page), so an answer is only trusted until the next mount.
export function sourceCapabilitiesQuery(providerConfigId: string) {
  return queryOptions({
    queryKey: sourceQueryKeys.configCapabilities(providerConfigId),
    staleTime: 0,
    queryFn: async () => {
      const res = await chromeRpcClient.providerGetCapabilities({
        providerConfigId,
      })
      return res.data
    },
  })
}

export function useSourceCapabilities(
  providerConfigId: string | undefined
): SourceCapabilityAnswer | undefined {
  const { data } = useQuery({
    ...sourceCapabilitiesQuery(providerConfigId ?? ''),
    enabled: providerConfigId !== undefined,
  })
  return data
}

export function useCanRefetchDanmaku(
  episode: GenericEpisodeLite | undefined
): boolean {
  const providerConfigId =
    episode && isSourceEpisode(episode)
      ? episode.season.providerConfigId
      : undefined
  const answer = useSourceCapabilities(providerConfigId)
  return answer?.capabilities.danmaku ?? false
}

// Asking the background on every keystroke of a plain title is wasted work;
// only text shaped like a host or URL can match a manifest's URL patterns.
function mightBeUrl(text: string): boolean {
  return /^\S+\.\S+$/.test(text)
}

export function urlParseSourceQuery(text: string) {
  const url = text.trim()
  return queryOptions({
    queryKey: sourceQueryKeys.urlSource(url),
    staleTime: 0,
    queryFn: async (): Promise<UrlParseSource | null> => {
      if (!mightBeUrl(url)) {
        return null
      }
      const res = await chromeRpcClient.mediaFindUrlSource({ url })
      return res.data
    },
  })
}

export function useUrlParseSource(text: string): UrlParseSource | null {
  const { data } = useQuery({
    ...urlParseSourceQuery(text),
    placeholderData: keepPreviousData,
  })
  return data ?? null
}
