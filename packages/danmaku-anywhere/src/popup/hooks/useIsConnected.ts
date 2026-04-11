import { useQuery } from '@tanstack/react-query'

import { Logger } from '@/common/Logger'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { controllerRpcClient } from '@/common/rpcClient/controller/client'
import { sleep } from '@/common/utils/utils'

interface UseIsConnectedOptions {
  enabled?: boolean
}

export const useIsConnected = ({
  enabled = true,
}: UseIsConnectedOptions = {}) => {
  const query = useQuery({
    queryKey: tabQueryKeys.isConnected(),
    enabled,
    queryFn: async () => {
      try {
        const res = (await Promise.any([
          controllerRpcClient.ping(),
          sleep(1000),
        ])) as undefined | Awaited<ReturnType<typeof controllerRpcClient.ping>>
        return res?.data === true
      } catch (e) {
        Logger.debug('Content script is not connected', e)

        return false
      }
    },
    retry: 0,
    refetchInterval: (query) => {
      // poll until connected
      if (query.state.data === true) {
        return false
      }

      return 1000
    },
  })

  return query.data
}
