import { useSuspenseQuery } from '@tanstack/react-query'

import { Logger } from '@/common/Logger'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { tabRpcClient } from '@/common/rpcClient/tab/client'
import { sleep } from '@/common/utils/utils'

export const useIsConnected = () => {
  return useSuspenseQuery({
    queryKey: tabQueryKeys.isConnected(),
    queryFn: async () => {
      try {
        const res = (await Promise.any([
          await tabRpcClient.ping(),
          sleep(1500),
        ])) as undefined | Awaited<ReturnType<typeof tabRpcClient.ping>>
        return res?.data === true
      } catch (e) {
        Logger.debug('Content script is not connected', e)

        return false
      }
    },
    retry: 0,
  }).data
}
