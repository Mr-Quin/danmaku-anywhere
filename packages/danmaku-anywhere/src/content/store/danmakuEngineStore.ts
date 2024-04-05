import { DanmakuManager } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

interface DanmakuEngineStoreState {
  danmakuEngine: DanmakuManager
}

// provides a global singleton instance of DanmakuManager
const useStore = create<DanmakuEngineStoreState>(() => ({
  danmakuEngine: new DanmakuManager(),
}))

export const useDanmakuEngine = () => useStore((state) => state.danmakuEngine)
