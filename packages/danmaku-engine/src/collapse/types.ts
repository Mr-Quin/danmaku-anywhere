import type { DanmakuFilter } from '../options'

export interface LabeledPattern extends DanmakuFilter {
  /** Group key, displayed head text, and CSS hook (`.dan-collapsed--<label>`). */
  label: string
}

export interface CollapseDedupeConfig {
  enabled: boolean
  windowMs: number
  /** Max identical-in-window count that triggers dedupe; above this all pass. */
  maxDedupe: number
}

export interface CollapsePatternConfig {
  enabled: boolean
  /** Treat identical-text repeats as an implicit pattern (label = the text). */
  autoCollapse: boolean
  /** Minimum group size for collapse to fire; groups below this render individually. */
  minCount: number
  /** Count climbs from 1 as absorbs land vs. renders the final count on emit. */
  liveCount: boolean
  /** Briefly scale the counter on each increment. */
  pulse: boolean
  patterns: LabeledPattern[]
}

export interface CollapseConfig {
  dedupe: CollapseDedupeConfig
  pattern: CollapsePatternConfig
  whiteList: DanmakuFilter[]
}

export interface GroupSnapshot {
  count: number
}

/** `setCount` is monotonic — order-insensitive, idempotent. */
export interface GroupStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => GroupSnapshot
  setCount: (n: number) => void
}

export interface CollapseAnnotation {
  label: string
  pulse: boolean
  store: GroupStore
  /** Source-comment index of this head. */
  headIndex: number
}

export type Decision =
  | { kind: 'block' }
  | { kind: 'whitelist' }
  | { kind: 'dedupe' }
  | { kind: 'normal' }
  | {
      kind: 'absorbed'
      headIndex: number
      /** Cumulative count at this absorb (2 for the first absorb, 3 for the second, ...). */
      count: number
    }
  | {
      kind: 'head'
      label: string
      pulse: boolean
      /** True if produced by autoCollapse (label is the comment's text). */
      auto: boolean
      /** #absorbs + 1. */
      finalCount: number
      /** Wall-clock seconds at which the pill should disappear. */
      endTime: number
    }

export interface BumpEvent {
  atSec: number
  headIndex: number
  /** Cumulative absorb count at this moment (2 for the first absorb, 3 for the second, ...). */
  count: number
}

export interface CompileResult {
  decisions: Decision[]
  /** All absorb events, sorted by atSec. */
  bumpEvents: BumpEvent[]
  /** Per-head bump events, sorted by atSec, for binary-searching the latest count. */
  bumpsByHead: Map<number, BumpEvent[]>
  /** Source indices of head decisions, in time order. */
  heads: number[]
}
