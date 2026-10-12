import { describe, expect, it } from 'vitest'
import type {
  PanelSubstate,
  PipelineEntry,
} from '@/common/rpcClient/background/types'
import { panelEntryForFrame } from './panelEntryForFrame'

/**
 * Decides what a player frame is told to show. Asserts the mounted entry goes
 * to the active frame only, and that every other substate, an absent entry or
 * an absent active frame resolves to null.
 */

function entry(substate: PanelSubstate): PipelineEntry {
  return { source: 'pipeline', substate }
}

describe('panelEntryForFrame', () => {
  it('passes a mounted entry to the active frame', () => {
    const mounted = entry('mounted')
    expect(panelEntryForFrame(mounted, 3, 3)).toBe(mounted)
  })

  it('gives other frames nothing', () => {
    expect(panelEntryForFrame(entry('mounted'), 0, 3)).toBeNull()
    expect(panelEntryForFrame(entry('mounted'), 0, undefined)).toBeNull()
  })

  it.each<PanelSubstate>([
    'loading',
    'matched',
    'noMatch',
    'idle',
    'error',
    'disconnected',
  ])('hides the %s substate', (substate) => {
    expect(panelEntryForFrame(entry(substate), 3, 3)).toBeNull()
  })

  it('passes through an absent entry', () => {
    expect(panelEntryForFrame(null, 3, 3)).toBeNull()
  })
})
