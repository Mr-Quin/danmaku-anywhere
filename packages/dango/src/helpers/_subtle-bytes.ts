// WebCrypto's typings reject Uint8Array<ArrayBufferLike>; allocating over a
// concrete ArrayBuffer is the workaround so subtle.* accepts our buffers.

export function u8(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(length))
}

export const ZERO_IV: Uint8Array<ArrayBuffer> = u8(16)

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64.replace(/\s+/g, ''))
  const bytes = u8(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
