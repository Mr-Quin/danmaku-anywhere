import { describe, expect, it } from 'vitest'
import { applyFilter, filterComments, transformComment } from './parser'

/**
 * Exercises the pure filter primitives the engine and renderer share,
 * plus transformComment. Asserts text-includes vs regex semantics, the
 * enabled flag, that filterComments drops everything matched by any
 * enabled filter, and that a comment with an unknown mode is dropped
 * (null) rather than throwing.
 */

describe('transformComment', () => {
  it('parses a valid comment', () => {
    const parsed = transformComment({ p: '10,1,16777215,0', m: 'hi' }, 0)
    expect(parsed).toMatchObject({ text: 'hi', mode: 'rtl', time: 10 })
  })

  it('returns null for an unknown mode', () => {
    expect(transformComment({ p: '10,99,16777215,0', m: 'hi' }, 0)).toBeNull()
  })
})

describe('applyFilter', () => {
  it('matches text via includes', () => {
    expect(
      applyFilter('hello world', [
        { type: 'text', value: 'hello', enabled: true },
      ])
    ).toBe(true)
    expect(
      applyFilter('hello world', [
        { type: 'text', value: 'nope', enabled: true },
      ])
    ).toBe(false)
  })

  it('matches regex', () => {
    expect(
      applyFilter('lol', [{ type: 'regex', value: '^lol$', enabled: true }])
    ).toBe(true)
  })

  it('ignores disabled filters', () => {
    expect(
      applyFilter('hello', [{ type: 'text', value: 'hello', enabled: false }])
    ).toBe(false)
  })
})

describe('filterComments', () => {
  it('drops every comment matched by any enabled filter', () => {
    const result = filterComments(
      [
        { p: '1,1,16777215,0', m: 'hello' },
        { p: '2,1,16777215,0', m: 'world' },
      ],
      [{ type: 'text', value: 'hello', enabled: true }]
    )
    expect(result).toEqual([{ p: '2,1,16777215,0', m: 'world' }])
  })
})
