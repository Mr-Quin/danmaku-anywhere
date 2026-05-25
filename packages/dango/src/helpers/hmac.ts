/**
 * HMAC-SHA256 over a UTF-8 message and base64-encoded key, returning lowercase
 * hex. Generic enough that manifests can use it for any HMAC-SHA256 signing
 * scheme by base64-encoding the key in the manifest expression.
 */

function u8(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(length))
}

function base64Decode(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64.replace(/\s+/g, ''))
  const bytes = u8(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

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
    base64Decode(keyB64),
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
