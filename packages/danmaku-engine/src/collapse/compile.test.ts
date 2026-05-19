import { describe, expect, it } from 'vitest'
import { compile } from './compile'
import type { CollapseConfig, Decision, LabeledPattern } from './types'

/**
 * Static-compile correctness: precedence (block > whitelist > dedupe > pattern
 * > autoCollapse), dedupe batch threshold (≤max drops, >max passes all), and
 * collapse sliding-window absorb semantics.
 */

function items(...specs: [string, number][]) {
  return specs.map(([text, time]) => ({ text, time }))
}

function pattern(label: string, value: string): LabeledPattern {
  return { label, value, type: 'regex', enabled: true }
}

const baseConfig = (): CollapseConfig => ({
  dedupe: { enabled: true, windowMs: 100, maxDedupe: 2 },
  pattern: {
    enabled: true,
    autoCollapse: false,
    // Most tests want collapse on the 2nd match; bumped per-test as needed.
    minCount: 2,
    liveCount: true,
    pulse: true,
    patterns: [pattern('lol', '^lol$')],
  },
  whiteList: [],
})

function run(
  input: { text: string; time: number }[],
  overrides?: Partial<CollapseConfig>
) {
  return compile(input, {
    filters: [],
    collapse: { ...baseConfig(), ...overrides },
    stageDurationSec: 5,
  })
}

describe('compile - precedence', () => {
  it('block beats all', () => {
    const { decisions } = compile(items(['spoiler', 0]), {
      filters: [{ type: 'text', value: 'spoil', enabled: true }],
      collapse: baseConfig(),
      stageDurationSec: 5,
    })
    expect(decisions[0]).toEqual({ kind: 'block' })
  })

  it('whitelist bypasses dedupe + collapse', () => {
    const { decisions } = run(items(['lol', 0], ['lol', 0.05]), {
      whiteList: [{ type: 'text', value: 'lol', enabled: true }],
    })
    expect(decisions[0]).toEqual({ kind: 'whitelist' })
    expect(decisions[1]).toEqual({ kind: 'whitelist' })
  })

  it('user pattern wins over autoCollapse', () => {
    // Two matches so the head doesn't get demoted to a singleton.
    const { decisions } = run(items(['lol', 0], ['lol', 1]), {
      pattern: { ...baseConfig().pattern, autoCollapse: true },
    })
    const d = decisions[0]
    expect(d.kind).toBe('head')
    if (d.kind === 'head') {
      expect(d.label).toBe('lol')
      expect(d.auto).toBe(false)
    }
  })
})

describe('compile - dedupe', () => {
  it('drops 2nd of 2 in window', () => {
    const { decisions } = run(items(['hi there', 0], ['hi there', 0.05]))
    expect(decisions[0]).toEqual({ kind: 'normal' })
    expect(decisions[1]).toEqual({ kind: 'dedupe' })
  })

  it('passes all 3 when batch exceeds maxDedupe=2', () => {
    const { decisions } = run(
      items(['hi there', 0], ['hi there', 0.03], ['hi there', 0.06])
    )
    // No 'dedupe' kinds — all three survive
    expect(decisions.every((d) => d.kind !== 'dedupe')).toBe(true)
  })

  it('respects custom maxDedupe', () => {
    const { decisions } = run(
      items(['x', 0], ['x', 0.02], ['x', 0.04], ['x', 0.06]),
      {
        dedupe: { enabled: true, windowMs: 100, maxDedupe: 4 },
      }
    )
    // Batch of 4, maxDedupe 4 → drop the last 3, keep 1st
    const dropped = decisions.filter((d) => d.kind === 'dedupe').length
    expect(dropped).toBe(3)
  })

  it('separate batches outside window stay independent', () => {
    const { decisions } = run(
      items(['x', 0], ['x', 0.05], ['x', 1.0], ['x', 1.05])
    )
    // Two batches of 2 each → drop one from each
    const dropped = decisions.filter((d) => d.kind === 'dedupe').length
    expect(dropped).toBe(2)
  })

  it('dedupe disabled passes all', () => {
    const { decisions } = run(items(['hi', 0], ['hi', 0.05]), {
      dedupe: { enabled: false, windowMs: 100, maxDedupe: 2 },
    })
    expect(decisions.every((d) => d.kind !== 'dedupe')).toBe(true)
  })
})

describe('compile - collapse heads and absorbs', () => {
  it('first match becomes head, subsequent in window absorb', () => {
    const { decisions, bumpEvents } = run(
      items(['lol', 0], ['lol', 1], ['lol', 2])
    )
    expect(decisions[0].kind).toBe('head')
    expect(decisions[1]).toEqual({ kind: 'absorbed', headIndex: 0, count: 2 })
    expect(decisions[2]).toEqual({ kind: 'absorbed', headIndex: 0, count: 3 })
    expect(bumpEvents).toEqual([
      { atSec: 1, headIndex: 0, count: 2 },
      { atSec: 2, headIndex: 0, count: 3 },
    ])
    const head = decisions[0]
    if (head.kind === 'head') {
      expect(head.finalCount).toBe(3)
    }
  })

  it('sliding window: each absorb extends the deadline', () => {
    // Head at 0, stageDuration=5. Absorbs at 4, 8, 12, 16 → each within
    // 5s of the previous → all absorb.
    const { decisions } = run(
      items(['lol', 0], ['lol', 4], ['lol', 8], ['lol', 12], ['lol', 16])
    )
    expect(decisions[0].kind).toBe('head')
    for (let i = 1; i < 5; i++) {
      expect(decisions[i].kind).toBe('absorbed')
    }
  })

  it('gap past stageDuration starts a new head batch', () => {
    // Two batches of two — each absorbs once so neither head is demoted.
    const { decisions } = run(
      items(['lol', 0], ['lol', 1], ['lol', 10], ['lol', 11])
    )
    expect(decisions[0].kind).toBe('head')
    expect(decisions[1]).toEqual({ kind: 'absorbed', headIndex: 0, count: 2 })
    expect(decisions[2].kind).toBe('head')
    expect(decisions[3]).toEqual({ kind: 'absorbed', headIndex: 2, count: 2 })
  })

  it('demotes singleton head to normal', () => {
    const { decisions } = run(items(['lol', 0]))
    expect(decisions[0]).toEqual({ kind: 'normal' })
  })

  it('does not collapse groups below minCount', () => {
    // 4 matches, minCount=5 → render all individually.
    const { decisions, bumpEvents } = run(
      items(['lol', 0], ['lol', 1], ['lol', 2], ['lol', 3]),
      { pattern: { ...baseConfig().pattern, minCount: 5 } }
    )
    expect(decisions.every((d) => d.kind === 'normal')).toBe(true)
    expect(bumpEvents).toEqual([])
  })

  it('collapses when group reaches minCount', () => {
    const { decisions } = run(
      items(['lol', 0], ['lol', 1], ['lol', 2], ['lol', 3], ['lol', 4]),
      { pattern: { ...baseConfig().pattern, minCount: 5 } }
    )
    expect(decisions[0].kind).toBe('head')
    for (let i = 1; i < 5; i++) {
      expect(decisions[i].kind).toBe('absorbed')
    }
  })

  it('non-matching comment is normal', () => {
    const { decisions } = run(items(['hello world', 0]))
    expect(decisions[0]).toEqual({ kind: 'normal' })
  })

  it('autoCollapse uses text as label when no user pattern matches', () => {
    const { decisions } = run(items(['hello world', 0], ['hello world', 1]), {
      pattern: { ...baseConfig().pattern, autoCollapse: true },
    })
    const head = decisions[0]
    expect(head.kind).toBe('head')
    if (head.kind === 'head') {
      expect(head.label).toBe('hello world')
      expect(head.auto).toBe(true)
      expect(head.finalCount).toBe(2)
    }
  })
})

describe('compile - dedupe + collapse interaction', () => {
  it('survivors of dedupe feed into autoCollapse with correct count', () => {
    // User's example: 2 at t=0 (within 100ms), 1 at t=1, 1 at t=2, max=2.
    // Dedupe drops the 2nd. 3 survivors → autoCollapse ×3.
    const { decisions } = run(
      items(['A', 0], ['A', 0.05], ['A', 1], ['A', 2]),
      { pattern: { ...baseConfig().pattern, autoCollapse: true } }
    )
    const kinds = decisions.map((d) => d.kind)
    expect(kinds).toEqual(['head', 'dedupe', 'absorbed', 'absorbed'])
    const head = decisions[0]
    if (head.kind === 'head') {
      expect(head.finalCount).toBe(3)
    }
  })
})

describe('compile - empty', () => {
  it('handles empty input', () => {
    const result = compile([], {
      filters: [],
      collapse: baseConfig(),
      stageDurationSec: 5,
    })
    expect(result.decisions).toEqual([])
    expect(result.bumpEvents).toEqual([])
  })
})

describe('compile - bump event order', () => {
  it('bumpEvents are in time order', () => {
    const { bumpEvents } = run(
      items(['lol', 0], ['lol', 0.5], ['lol', 1.0], ['lol', 1.5])
    )
    for (let i = 1; i < bumpEvents.length; i++) {
      expect(bumpEvents[i].atSec >= bumpEvents[i - 1].atSec).toBe(true)
    }
  })
})

describe('compile - normal kind for default-empty decisions', () => {
  it('decisions array is fully populated', () => {
    const { decisions } = run(items(['x', 0], ['y', 1]), {
      pattern: {
        enabled: false,
        autoCollapse: false,
        minCount: 2,
        liveCount: true,
        pulse: true,
        patterns: [],
      },
      dedupe: { enabled: false, windowMs: 100, maxDedupe: 2 },
    })
    expect(decisions.every((d): d is Decision => d !== undefined)).toBe(true)
  })
})
