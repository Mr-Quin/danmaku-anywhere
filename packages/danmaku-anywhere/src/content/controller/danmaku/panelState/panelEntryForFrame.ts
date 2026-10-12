import type { PipelineEntry } from '@/common/rpcClient/background/types'

// The other substates are derived from flags that do not track the real search
// yet, so only a mounted entry is shown.
export function shownPipelineEntry(
  entry: PipelineEntry | null
): PipelineEntry | null {
  if (entry?.substate !== 'mounted') {
    return null
  }
  return entry
}

// Only the active frame holds the danmaku; any other frame with a video gets
// nothing, or it would claim to be mounted too.
export function panelEntryForFrame(
  entry: PipelineEntry | null,
  frameId: number,
  activeFrameId: number | undefined
): PipelineEntry | null {
  if (frameId !== activeFrameId) {
    return null
  }
  return shownPipelineEntry(entry)
}
