import { useEffect } from 'react'

import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useStore } from '@/content/controller/store/store'

export const useIconManager = () => {
  const config = useActiveConfig()
  const { isMounted, episodes } = useStore.use.danmaku()

  useEffect(() => {
    if (isMounted && episodes) {
      // Calculate total comment count from all mounted episodes
      const totalCommentCount = episodes.reduce(
        (sum, episode) => sum + episode.commentCount,
        0
      )

      return void chromeRpcClient.iconSet({
        state: 'active',
        count: totalCommentCount,
      })
    }
    return void chromeRpcClient.iconSet({ state: 'available' })
  }, [config, episodes, isMounted]) // config is included to ensure icon is reset when config changes
}
