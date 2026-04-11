import { useSuspenseQuery } from '@tanstack/react-query'

import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export interface ActiveTabInfo {
  url: string
  protocol: string
  pattern: string
  name: string
}

const MOUNTABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

function deriveActiveTabInfo(rawUrl: string): ActiveTabInfo | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  // Non-mountable schemes (chrome:, chrome-extension:, about:, etc.) have
  // `origin === 'null'` per the WHATWG URL spec, which would turn into a
  // garbage `null/*` pattern. Reject them outright so callers fall back to
  // empty defaults instead of pre-filling with bad data.
  if (!MOUNTABLE_PROTOCOLS.has(url.protocol)) {
    return null
  }
  // file:// URLs also have a `null` origin, so fall back to a match-all file
  // pattern the user can narrow down.
  if (url.protocol === 'file:') {
    return {
      url: url.href,
      protocol: url.protocol,
      pattern: 'file:///*',
      name: 'file://',
    }
  }
  return {
    url: url.href,
    protocol: url.protocol,
    pattern: `${url.origin}/*`,
    name: url.origin,
  }
}

export function useActiveTabInfo(): ActiveTabInfo | null {
  const { data } = useSuspenseQuery({
    queryKey: controlQueryKeys.activeTab(),
    queryFn: async () => {
      try {
        const res = await chromeRpcClient.getActiveTabUrl()
        return res.data ?? ''
      } catch {
        return ''
      }
    },
    select: deriveActiveTabInfo,
  })

  return data
}
