import { describe, expect, it } from 'vitest'
import {
  compilePatterns,
  compileRules,
  findMatchingPattern,
  matchesAnyRule,
} from './matchPattern'
import type { LabeledPattern } from './types'

/**
 * Exercises the pure pattern/rule matching primitives used by CollapseEngine.
 * Asserts first-match-wins ordering, disabled-pattern skipping, text vs regex
 * semantics, and that an invalid regex is treated as a non-match instead of
 * blowing up at compile time.
 */

function labeled(
  label: string,
  value: string,
  type: 'text' | 'regex' = 'regex',
  enabled = true
): LabeledPattern {
  return { label, type, value, enabled }
}

describe('findMatchingPattern', () => {
  it('returns the first enabled pattern that matches', () => {
    const compiled = compilePatterns([
      labeled('lol', '^(笑|lol|LOL|w+)$'),
      labeled('草', '^(草|艹)+$'),
    ])
    const match = findMatchingPattern('lol', compiled)
    expect(match?.pattern.label).toBe('lol')
  })

  it('returns undefined when no pattern matches', () => {
    const compiled = compilePatterns([labeled('lol', '^lol$')])
    expect(findMatchingPattern('hello', compiled)).toBeUndefined()
  })

  it('skips disabled patterns', () => {
    const compiled = compilePatterns([
      labeled('lol', '^lol$', 'regex', false),
      labeled('草', '^草$'),
    ])
    expect(findMatchingPattern('lol', compiled)).toBeUndefined()
  })

  it('first match wins by ordering', () => {
    const compiled = compilePatterns([
      labeled('a', '^a.*$'),
      labeled('b', '^a.*$'),
    ])
    expect(findMatchingPattern('abc', compiled)?.pattern.label).toBe('a')
  })

  it('text pattern uses includes semantics', () => {
    const compiled = compilePatterns([labeled('lol', 'lol', 'text')])
    expect(findMatchingPattern('hahalol', compiled)?.pattern.label).toBe('lol')
    expect(findMatchingPattern('haha', compiled)).toBeUndefined()
  })

  it('invalid regex becomes a never-match instead of throwing', () => {
    const compiled = compilePatterns([labeled('bad', '(invalid')])
    expect(findMatchingPattern('anything', compiled)).toBeUndefined()
  })
})

describe('matchesAnyRule', () => {
  it('returns true if any enabled rule matches', () => {
    const compiled = compileRules([
      { type: 'regex', value: '^\\w{1,2}$', enabled: true },
    ])
    expect(matchesAnyRule('hi', compiled)).toBe(true)
    expect(matchesAnyRule('hello', compiled)).toBe(false)
  })

  it('respects disabled rules', () => {
    const compiled = compileRules([
      { type: 'text', value: '神', enabled: false },
    ])
    expect(matchesAnyRule('神回', compiled)).toBe(false)
  })

  it('handles invalid regex defensively', () => {
    const compiled = compileRules([
      { type: 'regex', value: '(', enabled: true },
    ])
    expect(matchesAnyRule('hi', compiled)).toBe(false)
  })
})
