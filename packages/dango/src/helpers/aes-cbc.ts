import { base64ToBytes, u8, ZERO_IV } from './_subtle-bytes.js'

// WebCrypto doesn't support AES-CBC without PKCS#7 unpad on decrypt. The
// `padding: 'none'` path synthesizes a trailing block (aesEnc(0x10..0x10 XOR C_n))
// so subtle's mandatory unpad strips back exactly that synthetic block, leaving
// the original n blocks intact. Same fix-up-block trick as gateway-decrypt.ts.

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

const keyCache = new Map<string, Promise<CryptoKey>>()

function importKey(keyB64: string): Promise<CryptoKey> {
  const cached = keyCache.get(keyB64)
  if (cached !== undefined) {
    return cached
  }
  const decoded = base64ToBytes(keyB64)
  if (decoded.length !== 16 && decoded.length !== 24 && decoded.length !== 32) {
    throw new Error(
      `AES-CBC key must decode to 16, 24, or 32 bytes, got ${decoded.length}`
    )
  }
  const imported = crypto.subtle.importKey(
    'raw',
    decoded,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  )
  keyCache.set(keyB64, imported)
  return imported
}

function decodeIv(ivB64: string): Uint8Array<ArrayBuffer> {
  const iv = base64ToBytes(ivB64)
  if (iv.length !== 16) {
    throw new Error(`AES-CBC IV must decode to 16 bytes, got ${iv.length}`)
  }
  return iv
}

export async function aesCbcEncrypt(
  plaintext: string,
  keyB64: string,
  ivB64: string
): Promise<string> {
  const key = await importKey(keyB64)
  const iv = decodeIv(ivB64)
  const pt = new TextEncoder().encode(plaintext)
  const input = u8(pt.length)
  input.set(pt)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, input)
  )
  return bytesToBase64(ct)
}

async function decryptNoPad(
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
  ciphertext: Uint8Array<ArrayBuffer>
): Promise<Uint8Array> {
  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
    throw new Error(
      `AES-CBC ciphertext must be a non-empty multiple of 16 bytes, got ${ciphertext.length}`
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

  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, fullCt)
  )
}

export async function aesCbcDecrypt(
  ciphertextB64: string,
  keyB64: string,
  ivB64: string,
  padding: 'pkcs7' | 'none' = 'pkcs7'
): Promise<string> {
  const key = await importKey(keyB64)
  const iv = decodeIv(ivB64)
  const ct = base64ToBytes(ciphertextB64)
  const plaintext =
    padding === 'none'
      ? await decryptNoPad(key, iv, ct)
      : new Uint8Array(
          await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ct)
        )
  return new TextDecoder('utf-8').decode(plaintext)
}
