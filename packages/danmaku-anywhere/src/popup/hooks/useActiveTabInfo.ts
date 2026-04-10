import { useSuspenseQuery } from '@tanstack/react-query'

import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export interface ActiveTabInfo {
  url: string
  protocol: string
  pattern: string
  name: string
}

function deriveActiveTabInfo(rawUrl: string): ActiveTabInfo | null {
  try {
    const url = new URL(rawUrl)
    // file:// URLs have `origin === 'null'` per the WHATWG URL spec, so fall
    // back to a match-all file pattern the user can narrow down.
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
  } catch {
    return null
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
