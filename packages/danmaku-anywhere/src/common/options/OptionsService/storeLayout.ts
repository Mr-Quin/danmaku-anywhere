import {
  jsonStringCodePointBytes,
  QUOTA_BYTES_PER_ITEM,
  storedItemBytes,
  utf8Bytes,
} from '@/common/storage/syncQuota'
import { OptionsStorageError } from './OptionsStorageError'
import type { Options } from './types'

// How a store is laid out in storage. A store is one item holding its
// envelope while that fits the sync per-item limit. Past it, each field named
// in parts leaves the store's item: its JSON is cut into string chunks stored
// under "<key>.<field>.<index>", and the store's item records the chunk count
// and a hash of the JSON.
export interface StoreLayout {
  readonly key: string
  readonly parts?: readonly string[]
}

interface PartManifest {
  chunks: number
  hash: string
}

type Items = Record<string, unknown>

// Room left in each item for a browser that measures an item a little
// differently from storedItemBytes.
const SAFETY_BYTES = 64

export function chunkKey(key: string, part: string, index: number): string {
  return `${key}.${part}.${index}`
}

export function isLayoutKey(layout: StoreLayout, key: string): boolean {
  return key === layout.key || key.startsWith(`${layout.key}.`)
}

// The items of the store among everything stored in its area
export function layoutItems(layout: StoreLayout, area: Items): Items {
  return Object.fromEntries(
    Object.entries(area).filter(([key, value]) => {
      return value !== undefined && isLayoutKey(layout, key)
    })
  )
}

// Everything is written in one storage call, which the browser applies as a
// whole, so a reader never sees the store's item from one write and its
// chunks from another. Chunks the new layout does not use are blanked in that
// same call instead of removed after it: a separate remove could land after
// another context's write that uses those keys again.
export function encodeEnvelope(
  layout: StoreLayout,
  envelope: Options<unknown>,
  existing: Items
): Items {
  const items = splitEnvelope(layout, envelope) ?? {
    [layout.key]: envelope,
  }
  for (const [key, value] of Object.entries(existing)) {
    const unused = key !== layout.key && !(key in items)
    const holdsChunk = typeof value === 'string' && value !== ''
    if (unused && holdsChunk && isLayoutKey(layout, key)) {
      items[key] = ''
    }
  }
  return items
}

function splitEnvelope(
  layout: StoreLayout,
  envelope: Options<unknown>
): Items | undefined {
  const parts = layout.parts ?? []
  const fits =
    storedItemBytes(layout.key, envelope) <= QUOTA_BYTES_PER_ITEM - SAFETY_BYTES
  if (fits || parts.length === 0 || !isRecord(envelope.data)) {
    return undefined
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
    chunks.forEach((chunk, index) => {
      items[chunkKey(layout.key, part, index)] = chunk
    })
    manifest[part] = { chunks: chunks.length, hash: hashString(json) }
  }
  items[layout.key] = { version: envelope.version, data, parts: manifest }
  return items
}

// The envelope as it was written, with each part joined back into its field.
// A store's item without a parts record is returned as stored: a store that
// fits one item, options saved before the layout existed, or anything else
// for the upgrade to deal with.
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
    throw new OptionsStorageError('options.incomplete', layout.key)
  }
  const data: Record<string, unknown> = { ...stored.data }
  for (const [part, { chunks, hash }] of Object.entries(manifest)) {
    let json = ''
    for (let index = 0; index < chunks; index++) {
      const chunk = items[chunkKey(layout.key, part, index)]
      if (typeof chunk !== 'string') {
        throw new OptionsStorageError('options.incomplete', layout.key)
      }
      json += chunk
    }
    if (hashString(json) !== hash) {
      throw new OptionsStorageError('options.incomplete', layout.key)
    }
    data[part] = JSON.parse(json)
  }
  return { version: stored.version as number, data }
}

function readManifest(
  stored: Record<string, unknown>
): Record<string, PartManifest> | undefined {
  if (!isRecord(stored.parts)) {
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
  // The two quotes around the stored string, and room for a three-digit index
  const longestKey = chunkKey(key, part, 999)
  return QUOTA_BYTES_PER_ITEM - utf8Bytes(longestKey) - 2 - SAFETY_BYTES
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
