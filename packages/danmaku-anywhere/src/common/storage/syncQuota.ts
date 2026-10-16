// chrome.storage.sync limits. Firefox enforces the same numbers.
export const QUOTA_BYTES_PER_ITEM = 8192
export const QUOTA_BYTES = 102_400
export const MAX_ITEMS = 512

const encoder = new TextEncoder()

export function utf8Bytes(text: string): number {
  return encoder.encode(text).length
}

// Chrome counts an item as its key plus the value serialized by its own JSON
// writer, which escapes '<', U+2028 and U+2029 as \uXXXX where JSON.stringify
// leaves them as they are.
export function storedItemBytes(key: string, value: unknown): number {
  const json = JSON.stringify(value) ?? ''
  let extra = 0
  for (const char of json) {
    if (char === '<' || char === '\u007f') {
      extra += 5
    } else if (char === '\u2028' || char === '\u2029') {
      extra += 3
    }
  }
  return utf8Bytes(key) + utf8Bytes(json) + extra
}

// What one code point of a string costs inside a stored JSON string value,
// counted the way storedItemBytes counts it.
export function jsonStringCodePointBytes(codePoint: string): number {
  switch (codePoint) {
    case '"':
    case '\\':
    case '\b':
    case '\f':
    case '\n':
    case '\r':
    case '\t':
      return 2
    case '<':
    case '\u007f':
    case '\u2028':
    case '\u2029':
      return 6
  }
  const code = codePoint.codePointAt(0) ?? 0
  if (code < 0x20) {
    return 6
  }
  // A lone surrogate is written as a \uXXXX escape.
  if (code >= 0xd800 && code <= 0xdfff) {
    return 6
  }
  return utf8Bytes(codePoint)
}
