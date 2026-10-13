import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import {
  keepPreviousData,
  type QueryObserverResult,
  queryOptions,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { isSourceEpisode } from '@/common/danmaku/utils'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import {
  capabilitiesOf,
  type SourceCapabilityAnswer,
  type UrlParseAnswer,
} from './sourceCapabilities'

const NOT_A_LINK: UrlParseAnswer = { kind: 'notLink' }

// followBackgroundChanges invalidates these when configs or manifests change.
export function sourceCapabilitiesQuery(providerConfigId: string) {
  return queryOptions({
    queryKey: sourceQueryKeys.configCapabilities(providerConfigId),
    staleTime: Number.POSITIVE_INFINITY,
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

function answersOf(results: QueryObserverResult<SourceCapabilityAnswer>[]) {
  return results.map((result) => result.data)
}

export function useSourceAnswers(
  providerConfigIds: string[]
): Map<string, SourceCapabilityAnswer> {
  const answers = useQueries({
    queries: providerConfigIds.map((id) => sourceCapabilitiesQuery(id)),
    combine: answersOf,
  })
  return useMemo(() => {
    const byId = new Map<string, SourceCapabilityAnswer>()
    answers.forEach((answer, index) => {
      if (answer) {
        byId.set(providerConfigIds[index], answer)
      }
    })
    return byId
  }, [providerConfigIds, answers])
}

export function useCanRefetchDanmaku(
  episode: GenericEpisodeLite | undefined
): boolean {
  const providerConfigId =
    episode && isSourceEpisode(episode)
      ? episode.season.providerConfigId
      : undefined
  return capabilitiesOf(useSourceCapabilities(providerConfigId)).danmaku
}

export function urlParseQuery(text: string) {
  const url = text.trim()
  return queryOptions({
    queryKey: sourceQueryKeys.urlSource(url),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<UrlParseAnswer> => {
      if (url === '') {
        return NOT_A_LINK
      }
      const res = await chromeRpcClient.mediaFindUrlSource({ url })
      return res.data
    },
  })
}

export function useUrlParseAnswer(text: string): UrlParseAnswer {
  const { data } = useQuery({
    ...urlParseQuery(text),
    placeholderData: keepPreviousData,
  })
  return data ?? NOT_A_LINK
}
