import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { decodeBilibiliDanmakuProto } from './proto'

describe('decodeBilibiliDanmakuProto', () => {
  it('decodes a DmSegMobileReply payload into CommentEntity[]', async () => {
    const bytes = await readFile(resolve(__dirname, './test/danmakuProto.dm'))

    const comments = await decodeBilibiliDanmakuProto(new Uint8Array(bytes))

    expect(comments).toHaveLength(937)
    for (const comment of comments) {
      expect(typeof comment.p).toBe('string')
      expect(typeof comment.m).toBe('string')
    }
  })

  it('throws when given invalid bytes', async () => {
    const invalid = new TextEncoder().encode('not a real proto payload')

    await expect(decodeBilibiliDanmakuProto(invalid)).rejects.toBeInstanceOf(
      Error
    )
  })
})
