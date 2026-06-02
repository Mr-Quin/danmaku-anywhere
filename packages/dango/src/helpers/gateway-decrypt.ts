/**
 * AES-256-ECB decryption with PKCS#7 padding and a nibble-permuted key
 * derivation step. Used by sources whose response bodies are encrypted at
 * the gateway layer; the manifest passes in the base64 key and the helper
 * reproduces the upstream's key-derivation contract so a key rotation is
 * a manifest edit rather than a code change.
 *
 * Key derivation: base64-decode the supplied string to 32 bytes, then map
 * each nibble through the fixed 16-entry permutation table below. The
 * result is the 32-byte AES-256 key handed to subtle.importKey.
 *
 * Web Crypto exposes AES-CBC but not AES-ECB. We synthesize ECB-decrypt
 * by calling CBC-decrypt with a zero IV and un-chaining the result. A
 * final synthetic block is appended so that the CBC layer's mandatory
 * PKCS#7 unpadding succeeds; we strip the real PKCS#7 pad ourselves.
 */
import { base64ToBytes, u8, ZERO_IV } from './_subtle-bytes.js'

const NIBBLE_PERM = new Uint8Array([
  3, 5, 7, 0, 15, 10, 13, 1, 11, 14, 4, 6, 9, 12, 8, 2,
])

// Caching by the manifest-supplied key string lets repeated calls within a
// pipeline (one per response segment) share the same CryptoKey import while
// still supporting a key rotation mid-session via a manifest edit.
const keyCache = new Map<string, Promise<CryptoKey>>()

function deriveAesKey(keyB64: string): Uint8Array<ArrayBuffer> {
  const decoded = base64ToBytes(keyB64)
  if (decoded.length !== 32) {
    throw new Error(
      `gateway key must decode to 32 bytes, got ${decoded.length} from ${keyB64.length}-char base64`
    )
  }
  const out = u8(32)
  for (let i = 0; i < 32; i++) {
    const b = decoded[i] as number
    out[i] = (NIBBLE_PERM[b >> 4] << 4) | NIBBLE_PERM[b & 0x0f]
  }
  return out
}

function getKey(keyB64: string): Promise<CryptoKey> {
  const cached = keyCache.get(keyB64)
  if (cached !== undefined) {
    return cached
  }
  const imported = crypto.subtle.importKey(
    'raw',
    deriveAesKey(keyB64),
    { name: 'AES-CBC' },
    false,
    ['decrypt', 'encrypt']
  )
  keyCache.set(keyB64, imported)
  return imported
}

/**
 * Returns AES-256-ECB-decrypt(ciphertext) with PKCS#7 padding stripped.
 *
 * Algorithm:
 *  1. Compute cExtra = AES_enc(0x10..0x10 XOR C[n-1]) via a single
 *     subtle.encrypt call. (CBC with IV=0 emits AES_enc(input) as its first
 *     output block.)
 *  2. CBC-decrypt [C, cExtra] with IV=0. The synthetic trailing block now
 *     decrypts to a full 0x10 PKCS#7 pad, which subtle strips, leaving n
 *     blocks of CBC-decrypt output of the original ciphertext.
 *  3. Un-chain in place: P_ecb[i] = cbcOut[i] XOR C[i-1] for i >= 1.
 *  4. Strip the real PKCS#7 pad from the unchained plaintext. (subtle has
 *     no opportunity to validate the inner pad; we get arbitrary bytes back
 *     for malformed inputs, so range-check before slicing.)
 */
async function ecbDecrypt(
  key: CryptoKey,
  ciphertext: Uint8Array<ArrayBuffer>
): Promise<Uint8Array> {
  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
    throw new Error(
      `gateway ciphertext must be a non-empty multiple of 16 bytes, got ${ciphertext.length}`
    )
  }
  const n = ciphertext.length / 16
  const cLast = ciphertext.subarray((n - 1) * 16, n * 16)

  const aesInput = u8(16)
  for (let i = 0; i < 16; i++) {
    aesInput[i] = 0x10 ^ (cLast[i] as number)
  }
  const cbcEncOut = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-CBC', iv: ZERO_IV }, key, aesInput)
  )

  const fullCt = u8(ciphertext.length + 16)
  fullCt.set(ciphertext, 0)
  fullCt.set(cbcEncOut.subarray(0, 16), ciphertext.length)

  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ZERO_IV }, key, fullCt)
  )

  for (let i = 1; i < n; i++) {
    const prevOffset = (i - 1) * 16
    const dstOffset = i * 16
    for (let j = 0; j < 16; j++) {
      plaintext[dstOffset + j] ^= ciphertext[prevOffset + j] as number
    }
  }

  const padLen = plaintext[plaintext.length - 1] as number
  if (padLen < 1 || padLen > 16) {
    throw new Error(`invalid PKCS#7 pad length: ${padLen}`)
  }
  return plaintext.subarray(0, plaintext.length - padLen)
}

/**
 * Decrypts a base64-encoded gateway response into a UTF-8 string. `keyB64`
 * is the base64 string the upstream uses (carried by the calling manifest
 * so rotation is a manifest edit, not a code change).
 */
export async function gatewayDecrypt(
  ciphertextB64: string,
  keyB64: string
): Promise<string> {
  const ciphertext = base64ToBytes(ciphertextB64)
  const key = await getKey(keyB64)
  const plaintext = await ecbDecrypt(key, ciphertext)
  return new TextDecoder('utf-8').decode(plaintext)
}
