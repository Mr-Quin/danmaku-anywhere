import type { PipelineEntry } from '@/common/rpcClient/background/types'

// pipeline is pushed from the controller; occlusion is written locally.
export type PanelSource = 'pipeline' | 'occlusion'

// `off` is not a state: when occlusion is not engaged the row is simply absent.
export type OcclusionState = 'loading' | 'on' | 'error'

export interface OcclusionEntry {
  source: 'occlusion'
  state: OcclusionState
  message?: string
}

export type PanelEntry = PipelineEntry | OcclusionEntry
