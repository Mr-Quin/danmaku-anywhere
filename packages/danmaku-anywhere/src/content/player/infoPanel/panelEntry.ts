import type { PipelineEntry } from '@/common/rpcClient/background/types'

/**
 * Sources that can contribute a status row to the info panel. `pipeline` is
 * pushed from the controller frame; `occlusion` is written locally in the
 * player frame. New sources are added here and slot into the keyed store and
 * the resolve order without reshaping anything.
 */
export type PanelSource = 'pipeline' | 'occlusion'

// `off` is not a state: when occlusion is not engaged the adapter emits no
// entry, so the keyed store simply has no occlusion key and the row is absent.
export type OcclusionState = 'loading' | 'on' | 'error'

export interface OcclusionEntry {
  source: 'occlusion'
  state: OcclusionState
  message?: string
}

export type PanelEntry = PipelineEntry | OcclusionEntry
