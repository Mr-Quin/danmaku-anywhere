import { describe, expect, it } from 'vitest'
import { summarizePayload } from './server'

describe('summarizePayload', () => {
  it('logs ids and flags as they are and lists and long text by size', () => {
    const comments = Array.from({ length: 5000 }, (_, i) => ({ p: i, m: 'hi' }))

    expect(
      summarizePayload({
        episodeId: 188860003,
        title: 'Episode 3',
        comments,
        xml: 'x'.repeat(10_000),
        meta: { providerIds: { id: 1 } },
        force: true,
      })
    ).toEqual({
      episodeId: 188860003,
      title: 'Episode 3',
      comments: 'array(5000)',
      xml: 'string(10000)',
      meta: 'object',
      force: true,
    })
  })

  it('summarizes a payload that is itself a list or a value', () => {
    expect(summarizePayload([1, 2, 3])).toBe('array(3)')
    expect(summarizePayload(undefined)).toBeUndefined()
    expect(summarizePayload(42)).toBe(42)
  })
})
