import type { PipelineEntry } from '@/common/rpcClient/background/types'

// The most recent pipeline entry the broadcaster derived, so a frame that pulls
// on connect can be answered without re-deriving it outside React. Safe as a
// module singleton only because the controller frame mounts exactly one
// PanelStateBroadcaster; it is the sole writer.
let latest: PipelineEntry | null = null

export function setLatestPipelineEntry(entry: PipelineEntry): void {
  latest = entry
}

export function getLatestPipelineEntry(): PipelineEntry | null {
  return latest
}
