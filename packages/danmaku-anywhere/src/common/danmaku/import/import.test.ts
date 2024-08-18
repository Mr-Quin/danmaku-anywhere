import { produce } from 'immer'
import { describe, expect, it } from 'vitest'

import { importDanmakuSchema } from './import'

import { importCommentSchema } from '@/common/danmaku/import/commentSchema'
import { v2, v1, validComment } from '@/common/danmaku/import/sample'
import type { DanmakuInsert } from '@/common/danmaku/models/danmaku'

describe('commentSchema', () => {
  it('accepts valid comment', () => {
    const result = importCommentSchema.parse(validComment)
    expect(result).toEqual(validComment)

    const removedCid = produce<any>(validComment, (draft) => {
      delete draft.cid
    })

    expect(importCommentSchema.parse(removedCid)).toEqual({
      ...removedCid,
      cid: undefined,
    })
  })

  it('rejects comment with missing properties', () => {
    const noM = produce<any>(validComment, (draft) => {
      delete draft.p
    })
    const noP = produce<any>(validComment, (draft) => {
      delete draft.p
    })
    expect(() => importCommentSchema.parse(noM)).toThrow()
    expect(() => importCommentSchema.parse(noP)).toThrow()
  })

  it('rejects comment with invalid properties', () => {
    const invalidP = produce<any>(validComment, (draft) => {
      draft.p = 'invalid'
    })
    const invalidTime = produce<any>(validComment, (draft) => {
      draft.p = '-1,1,16777215'
    })
    const invalidColor = produce<any>(validComment, (draft) => {
      draft.p = '0.00,1,abcde'
    })
    expect(() => importCommentSchema.parse(invalidP)).toThrow()
    expect(() => importCommentSchema.parse(invalidTime)).toThrow()
    expect(() => importCommentSchema.parse(invalidColor)).toThrow()
  })
})

function assertType(input: DanmakuInsert[]): asserts input is DanmakuInsert[] {
  return
}

describe('danmakuCacheSchemaOne', () => {
  describe('v1', () => {
    it('accepts valid DDP danmaku', () => {
      expect(() => importDanmakuSchema.parse([v1.danDanPlay])).not.toThrow()

      const res = importDanmakuSchema.parse([v1.danDanPlay])
      assertType(res)
    })

    it('accepts valid custom danmaku', () => {
      expect(() => importDanmakuSchema.parse([v1.custom])).not.toThrow()

      const res = importDanmakuSchema.parse([v1.custom])
      assertType(res)
    })
  })

  describe('v2', () => {
    it('accepts valid DDP danmaku', () => {
      expect(() => importDanmakuSchema.parse([v2.danDanPlay])).not.toThrow()

      const res = importDanmakuSchema.parse([v2.danDanPlay])
      assertType(res)
    })

    it('accepts valid custom danmaku', () => {
      const res = importDanmakuSchema.parse([v2.custom])

      expect(res).toEqual([v2.custom])
      assertType(res)
    })

    it('accepts valid bilibili danmaku', () => {
      const res = importDanmakuSchema.parse([v2.bilibili])

      expect(res).toEqual([v2.bilibili])
      assertType(res)
    })
  })
})
