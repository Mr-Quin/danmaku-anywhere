import {
  jsonStringCodePointBytes,
  QUOTA_BYTES_PER_ITEM,
  utf8Bytes,
} from '@/common/storage/syncQuota'
import { OptionsStorageError } from './OptionsStorageError'
import type { Options } from './types'

// How a store is laid out in storage. Each field named in parts is kept out
// of the store's own item: its JSON is cut into string chunks stored under
// "<key>.<field>.<index>", and the store's item records the chunk count and a
// hash of the JSON. A store with no parts is one item holding the envelope.
export interface StoreLayout {
  readonly key: string
  readonly parts?: readonly string[]
}

interface PartManifest {
  chunks: number
  hash: string
}

type Items = Record<string, unknown>

// More than the sync area can hold for one field (QUOTA_BYTES / chunk size).
export const MAX_CHUNKS_PER_PART = 16

// Room left in each chunk for a browser that measures an item a little
// differently from storedItemBytes.
const CHUNK_SAFETY_BYTES = 64

export function chunkKey(key: string, part: string, index: number): string {
  return `${key}.${part}.${index}`
}

// Every key the layout can occupy, so one read returns a consistent store
// whatever its chunk counts are.
export function layoutKeys(layout: StoreLayout): string[] {
  const keys = [layout.key]
  for (const part of layout.parts ?? []) {
    for (let index = 0; index < MAX_CHUNKS_PER_PART; index++) {
      keys.push(chunkKey(layout.key, part, index))
    }
  }
  return keys
}

export function isLayoutKey(layout: StoreLayout, key: string): boolean {
  return key === layout.key || key.startsWith(`${layout.key}.`)
}

// The chunk keys the store's item points to, which can include parts this
// build does not split.
export function referencedKeys(layout: StoreLayout, items: Items): string[] {
  const manifest = readManifest(items[layout.key])
  if (!manifest) {
    return []
  }
  return Object.entries(manifest).flatMap(([part, { chunks }]) => {
    return Array.from({ length: chunks }, (_, index) => {
      return chunkKey(layout.key, part, index)
    })
  })
}

// Everything is written in one storage call, which the browser applies as a
// whole, so a reader never sees the store's item from one write and its
// chunks from another. Chunks a shorter value no longer uses are blanked in
// that same call instead of removed after it: a separate remove could land
// after another context's write that uses those keys again.
export function encodeEnvelope(
  layout: StoreLayout,
  envelope: Options<unknown>,
  existing: Items
): Items {
  const parts = layout.parts ?? []
  if (parts.length === 0 || !isRecord(envelope.data)) {
    return { [layout.key]: envelope }
  }

  const items: Items = {}
  const data: Record<string, unknown> = { ...envelope.data }
  const manifest: Record<string, PartManifest> = {}
  for (const part of parts) {
    if (data[part] === undefined) {
      delete data[part]
      continue
    }
    const json = JSON.stringify(data[part])
    delete data[part]
    const chunks = splitJson(json, chunkBudget(layout.key, part))
    if (chunks.length > MAX_CHUNKS_PER_PART) {
      throw new OptionsStorageError('storeFull', layout.key)
    }
    chunks.forEach((chunk, index) => {
      items[chunkKey(layout.key, part, index)] = chunk
    })
    manifest[part] = { chunks: chunks.length, hash: hashString(json) }
  }
  for (const [key, value] of Object.entries(existing)) {
    const unused = key !== layout.key && !(key in items)
    const holdsChunk = typeof value === 'string' && value !== ''
    if (unused && holdsChunk && isLayoutKey(layout, key)) {
      items[key] = ''
    }
  }
  items[layout.key] = { version: envelope.version, data, parts: manifest }
  return items
}

// The envelope as it was written, with each part joined back into its field.
// A store's item without a parts record is returned as stored: options saved
// before the layout existed, or anything else for the upgrade to deal with.
export function decodeEnvelope(
  layout: StoreLayout,
  items: Items
): Options<unknown> | undefined {
  const stored = items[layout.key]
  if (!isRecord(stored) || !('parts' in stored)) {
    return stored as Options<unknown> | undefined
  }
  const manifest = readManifest(stored)
  if (!manifest || !isRecord(stored.data)) {
    throw new OptionsStorageError('incomplete', layout.key)
  }
  const data: Record<string, unknown> = { ...stored.data }
  for (const [part, { chunks, hash }] of Object.entries(manifest)) {
    let json = ''
    for (let index = 0; index < chunks; index++) {
      const chunk = items[chunkKey(layout.key, part, index)]
      if (typeof chunk !== 'string') {
        throw new OptionsStorageError('incomplete', layout.key)
      }
      json += chunk
    }
    if (hashString(json) !== hash) {
      throw new OptionsStorageError('incomplete', layout.key)
    }
    data[part] = JSON.parse(json)
  }
  return { version: stored.version as number, data }
}

function readManifest(
  stored: unknown
): Record<string, PartManifest> | undefined {
  if (!isRecord(stored) || !isRecord(stored.parts)) {
    return undefined
  }
  const manifest: Record<string, PartManifest> = {}
  for (const [part, entry] of Object.entries(stored.parts)) {
    if (
      !isRecord(entry) ||
      !Number.isInteger(entry.chunks) ||
      typeof entry.hash !== 'string'
    ) {
      return undefined
    }
    manifest[part] = { chunks: entry.chunks as number, hash: entry.hash }
  }
  return manifest
}

function chunkBudget(key: string, part: string): number {
  const longestKey = chunkKey(key, part, MAX_CHUNKS_PER_PART - 1)
  // The two quotes around the stored string
  return QUOTA_BYTES_PER_ITEM - utf8Bytes(longestKey) - 2 - CHUNK_SAFETY_BYTES
}

// Cuts only between code points: a surrogate pair split over two chunks would
// be stored as two replacement characters.
export function splitJson(json: string, budget: number): string[] {
  const chunks: string[] = []
  let chunk = ''
  let bytes = 0
  for (const codePoint of json) {
    const cost = jsonStringCodePointBytes(codePoint)
    if (bytes + cost > budget && chunk !== '') {
      chunks.push(chunk)
      chunk = ''
      bytes = 0
    }
    chunk += codePoint
    bytes += cost
  }
  if (chunk !== '') {
    chunks.push(chunk)
  }
  return chunks
}

// FNV-1a over UTF-16 code units. It only has to tell a torn read from a whole
// one.
function hashString(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
