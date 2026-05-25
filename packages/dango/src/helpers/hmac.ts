import { base64ToBytes, u8 } from './_subtle-bytes.js'

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

const keyCache = new Map<string, Promise<CryptoKey>>()

function importKey(keyB64: string): Promise<CryptoKey> {
  const cached = keyCache.get(keyB64)
  if (cached !== undefined) {
    return cached
  }
  const imported = crypto.subtle.importKey(
    'raw',
    base64ToBytes(keyB64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  keyCache.set(keyB64, imported)
  return imported
}

export async function hmacSha256(
  message: string,
  keyB64: string
): Promise<string> {
  const key = await importKey(keyB64)
  const msg = new TextEncoder().encode(message)
  const input = u8(msg.length)
  input.set(msg)
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, input))
  return bytesToHex(sig)
}
