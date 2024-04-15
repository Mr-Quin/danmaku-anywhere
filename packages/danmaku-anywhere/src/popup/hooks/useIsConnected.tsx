import { useSuspenseQuery } from '@tanstack/react-query'

import { tabRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { sleep } from '@/common/utils/utils'

export const useIsConnected = () => {
  return useSuspenseQuery({
    queryKey: ['tab', 'ping'],
    queryFn: async () => {
      try {
        const res = await Promise.any([await tabRpcClient.ping(), sleep(1500)])
        return res === true
      } catch (e) {
        Logger.debug('Content script is not connected')

        return false
      }
    },
    retry: 0,
  })
}
