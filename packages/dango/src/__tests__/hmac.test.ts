import { describe, expect, it } from 'vitest'
import { hmacSha256 } from '../helpers/hmac.js'

/**
 * Pins hmacSha256 against the RFC 4231 Test Case 1 vector and exercises
 * the same key across two distinct messages (cache reuse).
 */

const RFC4231_CASE1 = {
  // 20 bytes of 0x0b
  keyB64: 'CwsLCwsLCwsLCwsLCwsLCwsLCws=',
  message: 'Hi There',
  hex: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
}

describe('hmacSha256', () => {
  it('RFC 4231 Test Case 1', async () => {
    expect(await hmacSha256(RFC4231_CASE1.message, RFC4231_CASE1.keyB64)).toBe(
      RFC4231_CASE1.hex
    )
  })

  it('produces distinct signatures for distinct messages under the same key', async () => {
    const a = await hmacSha256('alpha', RFC4231_CASE1.keyB64)
    const b = await hmacSha256('beta', RFC4231_CASE1.keyB64)
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})
