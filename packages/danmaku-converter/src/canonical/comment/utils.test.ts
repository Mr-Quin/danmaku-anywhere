import { describe, expect, it } from 'vitest'

import {
  type CommentEntity,
  type CommentMode,
  parseCommentEntityP,
  zCommentEntity,
  zStoredCommentEntity,
} from './types.js'
import { commentOptionsToString } from './utils.js'

const commentEntity: CommentEntity = {
  cid: 1737712333,
  p: '658.73,1,16777215,[BiliBili]8a40949',
  m: '纯哥你怎么这么有女人缘啊',
}

const commentOptions = {
  time: 658.73,
  mode: 'rtl' as keyof typeof CommentMode,
  color: '#ffffff',
  uid: '[BiliBili]8a40949',
}

describe('comment entity conversion', () => {
  it('should convert string to object', () => {
    expect(parseCommentEntityP(commentEntity.p)).toEqual(commentOptions)
  })

  it('should convert object to string', () => {
    const p = commentOptionsToString(commentOptions)

    expect(p).toEqual(commentEntity.p)
  })

  it('should return null for an unknown mode', () => {
    expect(parseCommentEntityP('658.73,99,16777215,0')).toBeNull()
  })

  it('should return null for a time that is not a number', () => {
    expect(parseCommentEntityP('abc,1,16777215')).toBeNull()
  })

  it('should normalize mode 2 to rtl', () => {
    expect(parseCommentEntityP('12,2,16777215,uid')).toEqual({
      time: 12,
      mode: 'rtl',
      color: '#ffffff',
      uid: 'uid',
    })
  })

  it('should normalize mode 3 to rtl', () => {
    expect(parseCommentEntityP('12,3,16777215,uid')).toEqual({
      time: 12,
      mode: 'rtl',
      color: '#ffffff',
      uid: 'uid',
    })
  })
})

describe('zCommentEntity', () => {
  it('accepts a comment the renderer can parse', () => {
    expect(zCommentEntity.safeParse(commentEntity).success).toBe(true)
  })

  it.each([['garbage'], ['12,99,16777215'], ['abc,1,16777215']])(
    'rejects an unparseable p %s',
    (p) => {
      expect(zCommentEntity.safeParse({ p, m: 'text' }).success).toBe(false)
    }
  )

  it('leaves the stored shape lenient about p', () => {
    expect(
      zStoredCommentEntity.safeParse({ p: 'garbage', m: 'x' }).success
    ).toBe(true)
  })
})
