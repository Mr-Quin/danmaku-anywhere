import crypto from 'node:crypto'

// Pins the extension ID across unpacked load paths so swapping from prior
// to current keeps the same chrome.storage / IDB scope. Non-secret.
export const MIGRATION_EXTENSION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy3qW7yDyvkLonY3mlJZ18EdoJ6+Lxyz6ZVvoNp8vP8b/C7sXaAIugBepGxruHDvvxJrX+4gwQKAF4ayrMtuxSnhB3Ki8qcZ4lWyxWvNbBYbk9QhprF5BBj2fAEWSuF5GgJii2XHrD9VaBtx12G0kIQgkr6ubngEPxnM2bY7MqBPDFiDyuA94/aMMHxJt8oJR3J27QpFroNxYxSHpR3cpDnwQ8Y8GNfBllzavpCJkYd5ZQyQ9W3NtIDfJjjhvtXZJj0pjp51gTgKjf0xzmAdJCOmBp+DJU1shY2W10dvsUdrjXj050hRmayr/sot+i6egItzaUkG07KRMil1vmtgrmwIDAQAB'

export function computeExtensionIdFromKey(keyB64: string): string {
  const der = Buffer.from(keyB64, 'base64')
  const hex = crypto.createHash('sha256').update(der).digest('hex').slice(0, 32)
  const aCode = 'a'.charCodeAt(0)
  let id = ''
  for (const c of hex) {
    id += String.fromCharCode(aCode + Number.parseInt(c, 16))
  }
  return id
}

export const MIGRATION_EXTENSION_ID = computeExtensionIdFromKey(
  MIGRATION_EXTENSION_KEY
)
