import { describe, expect, it } from 'vitest'
import { gatewayDecrypt } from '../helpers/gateway-decrypt.js'

/**
 * Pins gatewayDecrypt to byte-identical output of the upstream gateway-crypto
 * reference. Fixtures were captured by running the upstream encrypt on each
 * plaintext with the key below; each pair survived a roundtrip through both
 * implementations.
 */

const FIXTURE_KEY_B64 = 'vwwLu7e6ug4HAQMAug8CsA8HD7oHDwuxAg4HAQG6DLA='

const FIXTURES: Array<{ pt: string; ct: string }> = [
  { pt: 'a', ct: 'SrwCsnaowVQ/9/lFAoZqLw==' },
  // 16-byte plaintext: forces a full extra PKCS#7 padding block.
  {
    pt: 'aaaaaaaaaaaaaaaa',
    ct: 'RMeZEC9vcqFygDd6b9np568pYzSyjl8mTRJsxRDRpjc=',
  },
  // 32-byte plaintext: two ECB blocks + a full pad block.
  {
    pt: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ct: 'RMeZEC9vcqFygDd6b9np50THmRAvb3KhcoA3em/Z6eevKWM0so5fJk0SbMUQ0aY3',
  },
  // Multi-byte UTF-8 round-trips correctly.
  {
    pt: 'unicode: 中文 弹幕',
    ct: 'toAIErk9C2pMNgylfC5dpFulaCoEt+RzDjBTgNGGdnk=',
  },
  // A JSON payload roughly shaped like a typical gateway response.
  {
    pt: '{"body":{"result":[{"v":"hello","start":1.5},{"v":"world","start":2.0}]}}',
    ct: 'DcLnQB5RnTkOU7UERdfQ0WnArqCRsNgw4/bXnG01IkiFAdb2eHWh2cTPaiGRbmpPuwwp00aVX2hObMw5pex+OrZged3Z7onB7098lwArlpc=',
  },
]

describe('gatewayDecrypt', () => {
  for (const { pt, ct } of FIXTURES) {
    it(`decrypts ${JSON.stringify(pt).slice(0, 48)}`, async () => {
      expect(await gatewayDecrypt(ct, FIXTURE_KEY_B64)).toBe(pt)
    })
  }

  it('rejects ciphertext that is not a multiple of 16 bytes', async () => {
    // 24 base64 chars with no padding -> 18 bytes decoded.
    await expect(
      gatewayDecrypt('AAAAAAAAAAAAAAAAAAAAAAAA', FIXTURE_KEY_B64)
    ).rejects.toThrow(/multiple of 16/)
  })

  it('rejects a key that does not decode to 32 bytes', async () => {
    await expect(
      gatewayDecrypt('SrwCsnaowVQ/9/lFAoZqLw==', 'YQ==')
    ).rejects.toThrow(/32 bytes/)
  })
})
