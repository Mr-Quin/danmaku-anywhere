import { create } from 'zustand'

import { DanmakuManager } from '@/common/danmaku/DanmakuManager'
import { createSelectors } from '@/common/utils/createSelectors'

interface DanmakuManagerStore {
  manager: DanmakuManager
}

const danmakuManagerStore = create<DanmakuManagerStore>(() => ({
  manager: new DanmakuManager(),
}))

// TODO: remove
export const useDanmakuManager = createSelectors(danmakuManagerStore)
