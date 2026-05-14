import { describe, expect, it } from 'vitest'

import { zCombinedDanmaku } from './index.js'

describe('zCombinedDanmaku', () => {
  it('parses a top-level CommentEntity array (e.g. decoded Bilibili protobuf)', () => {
    const input = [
      { p: '12.5,1,16777215', m: 'hello' },
      { p: '30,5,255', m: 'world' },
    ]

    const result = zCombinedDanmaku.parse(input)

    expect(result).toEqual([
      { p: '12.5,1,16777215', m: 'hello' },
      { p: '30,5,255', m: 'world' },
    ])
  })

  it('preserves uid in the array branch when present', () => {
    const input = [{ p: '5,1,16777215,user-1', m: 'hi' }]

    const result = zCombinedDanmaku.parse(input)

    expect(result).toEqual([{ p: '5,1,16777215,user-1', m: 'hi' }])
  })

  it('rejects arrays that are not comment entities', () => {
    expect(() => zCombinedDanmaku.parse([{ foo: 'bar' }])).toThrow()
  })
})
