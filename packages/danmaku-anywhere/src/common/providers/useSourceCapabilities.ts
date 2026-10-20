import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import {
  keepPreviousData,
  type QueryObserverResult,
  queryOptions,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { isSourceEpisode } from '@/common/danmaku/utils'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isLink } from '@/common/utils/link'
import {
  capabilitiesOf,
  type SourceCapabilityAnswer,
  type UrlParseAnswer,
} from './sourceCapabilities'

const NOT_A_LINK: UrlParseAnswer = { kind: 'notLink' }

const URL_CHECK_DELAY_MS = 150

// followBackgroundChanges invalidates these when configs or manifests change.
export function sourceCapabilitiesQuery(providerConfigId: string) {
  return queryOptions({
    queryKey: sourceQueryKeys.configCapabilities(providerConfigId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
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
  return {
    answers: results.map((result) => result.data),
    settled: results.every((result) => !result.isPending),
  }
}

export function useSourceAnswers(providerConfigIds: string[]): {
  answers: Map<string, SourceCapabilityAnswer>
  settled: boolean
} {
  const { answers, settled } = useQueries({
    queries: providerConfigIds.map((id) => sourceCapabilitiesQuery(id)),
    combine: answersOf,
  })
  const byId = useMemo(() => {
    const map = new Map<string, SourceCapabilityAnswer>()
    answers.forEach((answer, index) => {
      if (answer) {
        map.set(providerConfigIds[index], answer)
      }
    })
    return map
  }, [providerConfigIds, answers])
  return { answers: byId, settled }
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
    retry: false,
    queryFn: async (): Promise<UrlParseAnswer> => {
      if (!isLink(url)) {
        return NOT_A_LINK
      }
      const res = await chromeRpcClient.mediaFindUrlSource({ url })
      return res.data
    },
  })
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value)
    }, delayMs)
    return () => {
      clearTimeout(timeout)
    }
  }, [value, delayMs])
  return debounced
}

export function useUrlParseAnswer(text: string): UrlParseAnswer {
  const trimmed = text.trim()
  const settledText = useDebouncedValue(trimmed, URL_CHECK_DELAY_MS)
  const { data } = useQuery({
    ...urlParseQuery(settledText),
    placeholderData: keepPreviousData,
  })
  if (!isLink(trimmed)) {
    return NOT_A_LINK
  }
  return data ?? NOT_A_LINK
}
