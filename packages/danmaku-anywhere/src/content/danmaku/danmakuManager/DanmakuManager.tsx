import { memo } from 'react'

import { useDanmakuManager } from './useDanmakuManager'

export const DanmakuManager = memo(() => {
  useDanmakuManager()

  return null
})

DanmakuManager.displayName = 'DanmakuManager'
