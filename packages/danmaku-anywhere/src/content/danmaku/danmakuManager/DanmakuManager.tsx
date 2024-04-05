import { memo } from 'react'

import { useDanmakuManager } from './hooks/useDanmakuManager'

export const DanmakuManager = memo(() => {
  useDanmakuManager()

  return null
})

DanmakuManager.displayName = 'DanmakuManager'
