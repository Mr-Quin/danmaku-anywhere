import { describe, expect, it } from 'vitest'
import { aesCbcDecrypt, aesCbcEncrypt } from '../helpers/aes-cbc.js'

/**
 * Pins aesCbcEncrypt / aesCbcDecrypt against:
 *  - NIST SP 800-38A AES-128-CBC test vector F.2.1 (single-block plaintext)
 *  - roundtrip for AES-128 and AES-256 across multi-block UTF-8 payloads
 *  - the `padding: 'none'` variant exercised with a hanjutv-shaped fixture
 *    where the upstream contract is "decrypt without stripping any pad"
 *  - input validation: bad key length, bad IV length, non-block-multiple
 *    ciphertext in no-pad mode
 */

// AES-128 key/IV taken from NIST SP 800-38A F.2 (the canonical CBC vectors).
// Plaintext is ASCII because the helper takes a UTF-8 string; pinning a hex
// plaintext from F.2.1 would invite encoding ambiguity. Output captured from
// node's native AES-128-CBC + PKCS#7 to lock byte-equivalence with OpenSSL.
const NIST_AES_128 = {
  keyB64: 'K34VFiiu0qar9xWICc9PPA==',
  ivB64: 'AAECAwQFBgcICQoLDA0ODw==',
  ctB64: 'LTxaLAKtlPigN78iLmS2tTribd3JpD91goChgvG5TnE=',
  pt: 'YELLOW SUBMARINE',
}
const AES_256_KEY_B64 = 'QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE='

const HANJUTV_NO_PAD = {
  keyB64: 'ZjM0OXdnaGhlNzg0dHF3aA==',
  ivB64: 'ZDN3OGhmOTRmaWRrMzhsaw==',
  ctB64: 'PMUL6OjeIz7p8gb0BaVGvOCnk8gXRrJ2GgBj8ZJ9Sr0=',
  // Plaintext is a 25-char JSON string padded out to 32 bytes with NULs (the
  // shape hanjutv's response stream produces).
  ptJsonText: '{"a":1,"b":"hello world"}',
}

describe('aesCbcEncrypt / aesCbcDecrypt', () => {
  it('encrypts one ASCII block under AES-128 to the pinned ciphertext', async () => {
    expect(
      await aesCbcEncrypt(
        NIST_AES_128.pt,
        NIST_AES_128.keyB64,
        NIST_AES_128.ivB64
      )
    ).toBe(NIST_AES_128.ctB64)
  })

  it('decrypts the pinned ciphertext back to the original plaintext', async () => {
    expect(
      await aesCbcDecrypt(
        NIST_AES_128.ctB64,
        NIST_AES_128.keyB64,
        NIST_AES_128.ivB64
      )
    ).toBe(NIST_AES_128.pt)
  })

  it('roundtrips a multi-block UTF-8 payload under AES-128', async () => {
    const pt = JSON.stringify({ items: ['弹幕', '中文', 'mixed text 🎯'] })
    const ct = await aesCbcEncrypt(pt, NIST_AES_128.keyB64, NIST_AES_128.ivB64)
    expect(
      await aesCbcDecrypt(ct, NIST_AES_128.keyB64, NIST_AES_128.ivB64)
    ).toBe(pt)
  })

  it('roundtrips a multi-block UTF-8 payload under AES-256', async () => {
    const pt = `${'a'.repeat(123)} 弹幕`
    const ct = await aesCbcEncrypt(pt, AES_256_KEY_B64, NIST_AES_128.ivB64)
    expect(await aesCbcDecrypt(ct, AES_256_KEY_B64, NIST_AES_128.ivB64)).toBe(
      pt
    )
  })

  it('padding=none returns the raw decrypted bytes without stripping', async () => {
    const got = await aesCbcDecrypt(
      HANJUTV_NO_PAD.ctB64,
      HANJUTV_NO_PAD.keyB64,
      HANJUTV_NO_PAD.ivB64,
      'none'
    )
    // The JSON sits at the start; the trailing NULs are not stripped, matching
    // the upstream contract that returns whatever the AES-CBC chain decrypts to.
    expect(got.startsWith(HANJUTV_NO_PAD.ptJsonText)).toBe(true)
    expect(got.length).toBe(32)
  })

  it('padding=none rejects a non-block-multiple ciphertext', async () => {
    // 24 base64 chars w/o padding -> 18 bytes
    await expect(
      aesCbcDecrypt(
        'AAAAAAAAAAAAAAAAAAAAAAAA',
        NIST_AES_128.keyB64,
        NIST_AES_128.ivB64,
        'none'
      )
    ).rejects.toThrow(/multiple of 16/)
  })

  it('rejects a key that does not decode to 16/24/32 bytes', async () => {
    await expect(
      aesCbcEncrypt('x', 'YQ==', NIST_AES_128.ivB64)
    ).rejects.toThrow(/16, 24, or 32 bytes/)
  })

  it('rejects an IV that does not decode to 16 bytes', async () => {
    await expect(
      aesCbcEncrypt('x', NIST_AES_128.keyB64, 'YQ==')
    ).rejects.toThrow(/16 bytes/)
  })
})
