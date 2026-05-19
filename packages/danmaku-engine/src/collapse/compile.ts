import type { DanmakuFilter } from '../options'
import {
  compilePatterns,
  compileRules,
  findMatchingPattern,
  matchesAnyRule,
} from './matchPattern'
import type {
  BumpEvent,
  CollapseConfig,
  CompileResult,
  Decision,
  GroupSnapshot,
  GroupStore,
} from './types'

export interface CompileInput {
  text: string
  time: number
}

export interface CompileConfig {
  filters: DanmakuFilter[]
  collapse: CollapseConfig
  /** Sliding-window duration for a collapse head (≈ time a danmaku stays on screen). */
  stageDurationSec: number
}

/** Pure static pass over the time-sorted comment list. */
export function compile(
  items: readonly CompileInput[],
  config: CompileConfig
): CompileResult {
  const decisions: Decision[] = new Array(items.length)

  const compiledPatterns = compilePatterns(config.collapse.pattern.patterns)
  const compiledWhiteList = compileRules(config.collapse.whiteList)
  const compiledFilters = compileRules(config.filters)
  const dedupeEnabled = config.collapse.dedupe.enabled
  const dedupeWindowSec = config.collapse.dedupe.windowMs / 1000
  const maxDedupe = Math.max(2, config.collapse.dedupe.maxDedupe)

  // Phase 1: block, whitelist, group dedupe batches.
  type Batch = { startTime: number; indices: number[] }
  const lastBatchByText = new Map<string, Batch>()
  const allBatches: Batch[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (matchesAnyRule(item.text, compiledFilters)) {
      decisions[i] = { kind: 'block' }
      continue
    }
    if (matchesAnyRule(item.text, compiledWhiteList)) {
      decisions[i] = { kind: 'whitelist' }
      continue
    }
    if (!dedupeEnabled) {
      continue
    }
    const open = lastBatchByText.get(item.text)
    if (open && item.time - open.startTime <= dedupeWindowSec) {
      open.indices.push(i)
    } else {
      const batch: Batch = { startTime: item.time, indices: [i] }
      lastBatchByText.set(item.text, batch)
      allBatches.push(batch)
    }
  }

  for (const batch of allBatches) {
    if (batch.indices.length >= 2 && batch.indices.length <= maxDedupe) {
      for (let j = 1; j < batch.indices.length; j++) {
        decisions[batch.indices[j]] = { kind: 'dedupe' }
      }
    }
  }

  // Phase 2: build collapse groups (sliding-window by key).
  const patternEnabled = config.collapse.pattern.enabled
  const autoCollapse = config.collapse.pattern.autoCollapse
  const pulse = config.collapse.pattern.pulse
  const minCount = Math.max(2, config.collapse.pattern.minCount)
  const stageDurationSec = config.stageDurationSec

  type Group = { label: string; auto: boolean; indices: number[] }
  const openGroups = new Map<string, { group: Group; endTime: number }>()
  const allGroups: Group[] = []

  for (let i = 0; i < items.length; i++) {
    if (decisions[i] !== undefined) continue
    const item = items[i]

    let key: string | undefined
    let label = ''
    let auto = false

    if (patternEnabled) {
      const m = findMatchingPattern(item.text, compiledPatterns)
      if (m) {
        key = `p:${m.pattern.label}`
        label = m.pattern.label
      } else if (autoCollapse) {
        key = `a:${item.text}`
        label = item.text
        auto = true
      }
    }

    if (key === undefined) {
      decisions[i] = { kind: 'normal' }
      continue
    }

    const open = openGroups.get(key)
    if (open && item.time <= open.endTime) {
      open.group.indices.push(i)
      open.endTime = item.time + stageDurationSec
    } else {
      const group: Group = { label, auto, indices: [i] }
      openGroups.set(key, { group, endTime: item.time + stageDurationSec })
      allGroups.push(group)
    }
  }

  // Phase 3: commit. Groups smaller than `minCount` render individually.
  const bumpEvents: { atSec: number; headIndex: number; count: number }[] = []
  const bumpsByHead = new Map<number, BumpEvent[]>()
  const heads: number[] = []
  for (const group of allGroups) {
    if (group.indices.length < minCount) {
      for (const idx of group.indices) decisions[idx] = { kind: 'normal' }
      continue
    }
    const headIndex = group.indices[0]
    const lastIdx = group.indices[group.indices.length - 1]
    decisions[headIndex] = {
      kind: 'head',
      label: group.label,
      pulse,
      auto: group.auto,
      finalCount: group.indices.length,
      endTime: items[lastIdx].time + stageDurationSec,
    }
    heads.push(headIndex)
    const headBumps: BumpEvent[] = []
    bumpsByHead.set(headIndex, headBumps)
    for (let j = 1; j < group.indices.length; j++) {
      const idx = group.indices[j]
      const count = j + 1
      decisions[idx] = { kind: 'absorbed', headIndex, count }
      const event = { atSec: items[idx].time, headIndex, count }
      bumpEvents.push(event)
      headBumps.push(event)
    }
  }

  bumpEvents.sort((a, b) => a.atSec - b.atSec)

  return { decisions, bumpEvents, bumpsByHead, heads }
}

export function createGroupStore(): GroupStore {
  let state: GroupSnapshot = { count: 1 }
  const listeners = new Set<() => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot() {
      return state
    },
    setCount(n) {
      if (n <= state.count) return
      state = { count: n }
      for (const l of listeners) l()
    },
  }
}
