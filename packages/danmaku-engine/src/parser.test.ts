import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import type { DedupConfig } from './options'
import { dedupComments } from './parser'

function comment(text: string, time: number): CommentEntity {
  return { p: `${time},1,16777215,0`, m: text }
}

const baseConfig: DedupConfig = {
  enabled: true,
  tolerance: 0.5,
  whitelist: [],
}

describe('dedupComments', () => {
  it('returns same reference when disabled', () => {
    const comments = [comment('hello', 1), comment('hello', 1)]
    const result = dedupComments(comments, { ...baseConfig, enabled: false })
    expect(result).toBe(comments)
  })

  it('returns same array for empty input', () => {
    const comments: CommentEntity[] = []
    const result = dedupComments(comments, baseConfig)
    expect(result).toEqual([])
  })

  it('returns same array for single item', () => {
    const comments = [comment('hello', 1)]
    const result = dedupComments(comments, baseConfig)
    expect(result).toEqual([comment('hello', 1)])
  })

  it('deduplicates exact text within tolerance', () => {
    const comments = [comment('hello', 1.0), comment('hello', 1.3)]
    const result = dedupComments(comments, baseConfig)
    expect(result).toEqual([comment('hello', 1.0)])
  })

  it('keeps duplicates outside tolerance', () => {
    const comments = [comment('hello', 1.0), comment('hello', 2.0)]
    const result = dedupComments(comments, baseConfig)
    expect(result).toEqual([comment('hello', 1.0), comment('hello', 2.0)])
  })

  it('keeps different text at same timestamp', () => {
    const comments = [comment('hello', 1.0), comment('world', 1.0)]
    const result = dedupComments(comments, baseConfig)
    expect(result).toEqual([comment('hello', 1.0), comment('world', 1.0)])
  })

  it('exempts whitelist text match', () => {
    const config: DedupConfig = {
      ...baseConfig,
      whitelist: [{ type: 'text', value: '666', enabled: true }],
    }
    const comments = [comment('666', 1.0), comment('666', 1.0)]
    const result = dedupComments(comments, config)
    expect(result).toEqual([comment('666', 1.0), comment('666', 1.0)])
  })

  it('exempts whitelist regex match', () => {
    const config: DedupConfig = {
      ...baseConfig,
      whitelist: [{ type: 'regex', value: '^w{2,}$', enabled: true }],
    }
    const comments = [comment('www', 1.0), comment('www', 1.0)]
    const result = dedupComments(comments, config)
    expect(result).toEqual([comment('www', 1.0), comment('www', 1.0)])
  })

  it('does not exempt disabled whitelist entries', () => {
    const config: DedupConfig = {
      ...baseConfig,
      whitelist: [{ type: 'text', value: '666', enabled: false }],
    }
    const comments = [comment('666', 1.0), comment('666', 1.0)]
    const result = dedupComments(comments, config)
    expect(result).toEqual([comment('666', 1.0)])
  })

  it('keeps first occurrence (stability)', () => {
    const c1 = { p: '1,1,16777215,1', m: 'hello' }
    const c2 = { p: '1,1,16777215,2', m: 'hello' }
    const result = dedupComments([c1, c2], baseConfig)
    expect(result).toEqual([c1])
  })

  it('handles unsorted input correctly', () => {
    const comments = [
      comment('hello', 5.0),
      comment('hello', 1.0),
      comment('hello', 1.2),
    ]
    const result = dedupComments(comments, baseConfig)
    // After sorting by time: 1.0, 1.2, 5.0. 1.2 is within tolerance of 1.0, so dropped.
    expect(result).toHaveLength(2)
  })

  it('chains of duplicates keep only the first per tolerance window', () => {
    const comments = [
      comment('hello', 1.0),
      comment('hello', 1.3),
      comment('hello', 1.6),
      comment('hello', 1.9),
    ]
    // 1.0 kept. 1.3 within 0.5 of 1.0 -> dropped. 1.6 > 0.5 from 1.0 -> kept.
    // 1.9 within 0.5 of 1.6 -> dropped.
    const result = dedupComments(comments, baseConfig)
    expect(result).toEqual([comment('hello', 1.0), comment('hello', 1.6)])
  })
})
