import type { PipelineEntry } from '@/common/rpcClient/background/types'

// The most recent pipeline entry the broadcaster derived, so a frame that pulls
// on connect can be answered without re-deriving it. Safe as a module singleton
// only because startPanelStateBroadcaster is called once; it is the sole writer.
let latest: PipelineEntry | null = null

export function setLatestPipelineEntry(entry: PipelineEntry): void {
  latest = entry
}

export function getLatestPipelineEntry(): PipelineEntry | null {
  return latest
}
