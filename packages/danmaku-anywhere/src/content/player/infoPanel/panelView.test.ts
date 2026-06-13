import { describe, expect, it } from 'vitest'
import type { PanelSubstate } from '@/common/rpcClient/background/types'
import { panelView } from './panelView'

describe('panelView', () => {
  it('maps every substate to a severity', () => {
    const states: PanelSubstate[] = [
      'loading',
      'matched',
      'mounted',
      'noMatch',
      'idle',
      'error',
      'disconnected',
    ]
    for (const s of states) {
      expect(panelView(s).severity).toBeDefined()
    }
  })

  it('only shows the comment count when mounted', () => {
    expect(panelView('mounted').showCount).toBe(true)
    expect(panelView('matched').showCount).toBe(false)
    expect(panelView('loading').showCount).toBe(false)
  })

  it('pulses the dot only for in-progress states', () => {
    expect(panelView('loading').pulse).toBe(true)
    expect(panelView('matched').pulse).toBe(true)
    expect(panelView('mounted').pulse).toBe(false)
  })

  it('uses danger for error and disconnected', () => {
    expect(panelView('error').severity).toBe('danger')
    expect(panelView('disconnected').severity).toBe('danger')
  })

  it('exposes a headline for every substate', () => {
    const states: PanelSubstate[] = [
      'loading',
      'matched',
      'mounted',
      'noMatch',
      'idle',
      'error',
      'disconnected',
    ]
    for (const s of states) {
      expect(panelView(s).headline()).toBeTruthy()
    }
  })
})
