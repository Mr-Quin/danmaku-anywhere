import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { decodeBilibiliDanmakuProto } from './decodeBilibiliDanmakuProto'

describe('decodeBilibiliDanmakuProto', () => {
  it('decodes a real-world DmSegMobileReply segment', async () => {
    const bytes = await readFile(
      resolve(__dirname, './test/bilibiliProtoSegment.bin')
    )

    const comments = await decodeBilibiliDanmakuProto(new Uint8Array(bytes))

    expect(comments.length).toBeGreaterThan(0)
    expect(comments[0]).toMatchObject({
      p: expect.stringMatching(/^\d+(\.\d+)?,\d+,\d+$/),
      m: expect.any(String),
    })
  })

  it('throws when given invalid bytes', async () => {
    const invalid = new TextEncoder().encode('not a real proto payload')

    await expect(decodeBilibiliDanmakuProto(invalid)).rejects.toBeInstanceOf(
      Error
    )
  })
})
