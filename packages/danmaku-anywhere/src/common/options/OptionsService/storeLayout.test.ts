import { describe, expect, it } from 'vitest'
import { chromeItemBytes } from '@/tests/syncQuota'
import { getOptionsStorageError } from './OptionsStorageError'
import {
  chunkKey,
  decodeEnvelope,
  encodeEnvelope,
  referencedKeys,
  type StoreLayout,
} from './storeLayout'

/**
 * The storage layout of an option store. Fields named as parts leave the
 * store's own item and are cut into string chunks that each fit Chrome's
 * per-item limit as Chrome counts it, never inside a surrogate pair. Decoding
 * joins them back into the same envelope, and returns an item written without
 * parts as it is. Chunks a shorter value no longer needs are blanked in the
 * same write. A missing chunk, chunks from different writes or a damaged parts
 * record decode as an incomplete store instead of partial data.
 */

const layout: StoreLayout = { key: 'store', parts: ['list', 'text'] }

const PER_ITEM = 8192

function envelope(data: Record<string, unknown>, version = 3) {
  return { data, version }
}

function longList(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    value: `rule ${index} "quoted" <tag> 弹幕`,
    enabled: index % 2 === 0,
  }))
}

function expectIncomplete(read: () => unknown) {
  let error: unknown
  try {
    read()
  } catch (caught) {
    error = caught
  }
  expect(getOptionsStorageError(error)).toEqual({
    problem: 'incomplete',
    store: 'store',
  })
}

describe('encodeEnvelope and decodeEnvelope', () => {
  it('stores a store without parts as one item', () => {
    const stored = envelope({ list: [1, 2] })

    const items = encodeEnvelope({ key: 'store' }, stored, {})

    expect(items).toEqual({ store: stored })
    expect(decodeEnvelope({ key: 'store' }, items)).toEqual(stored)
  })

  it('moves the parts out of the store item and joins them back', () => {
    const stored = envelope({ scalar: 1, list: longList(3), text: 'a{}' })

    const items = encodeEnvelope(layout, stored, {})

    expect(items.store).toEqual({
      version: 3,
      data: { scalar: 1 },
      parts: {
        list: { chunks: 1, hash: expect.any(String) },
        text: { chunks: 1, hash: expect.any(String) },
      },
    })
    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })

  it('leaves out a part the data does not have', () => {
    const stored = envelope({ scalar: 1, list: [] })

    const items = encodeEnvelope(layout, stored, {})

    expect(Object.keys(items).sort()).toEqual(
      ['store', chunkKey('store', 'list', 0)].sort()
    )
    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })

  it('reads an item written before the layout as it is', () => {
    const stored = envelope({ scalar: 1, list: longList(2), text: 'b' }, 1)

    expect(decodeEnvelope(layout, { store: stored })).toEqual(stored)
    expect(decodeEnvelope(layout, { store: 'garbage' })).toBe('garbage')
    expect(decodeEnvelope(layout, {})).toBeUndefined()
  })

  it('cuts a long part into chunks that each fit the item limit', () => {
    const text = '<b>"弹幕"</b>\\\n\u2028😀'.repeat(1200)
    const stored = envelope({ list: longList(800), text })

    const items = encodeEnvelope(layout, stored, {})

    expect(Object.keys(items).length).toBeGreaterThan(10)
    for (const [key, value] of Object.entries(items)) {
      expect(chromeItemBytes(key, value), key).toBeLessThanOrEqual(PER_ITEM)
    }
    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })

  it('never cuts a surrogate pair in two', () => {
    const stored = envelope({ text: '😀'.repeat(10_000) })

    const items = encodeEnvelope(layout, stored, {})

    const chunks = Object.entries(items)
      .filter(([key]) => key !== 'store')
      .map(([, value]) => value as string)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.isWellFormed()).toBe(true)
    }
  })

  it('blanks the chunks a shorter value no longer uses in the same write', () => {
    const long = encodeEnvelope(layout, envelope({ list: longList(800) }), {})
    const longChunks = referencedKeys(layout, long)
    expect(longChunks.length).toBeGreaterThan(2)

    const short = encodeEnvelope(layout, envelope({ list: longList(1) }), long)

    expect(referencedKeys(layout, short)).toEqual([
      chunkKey('store', 'list', 0),
    ])
    for (const key of longChunks.slice(1)) {
      expect(short[key]).toBe('')
    }
    expect(decodeEnvelope(layout, { ...long, ...short })).toEqual(
      envelope({ list: longList(1) })
    )
  })

  it('writes nothing for chunk keys that hold nothing', () => {
    const items = encodeEnvelope(layout, envelope({ list: [1] }), {
      [chunkKey('store', 'list', 3)]: undefined,
      [chunkKey('store', 'text', 0)]: '',
    })

    expect(Object.keys(items).sort()).toEqual(
      ['store', chunkKey('store', 'list', 0)].sort()
    )
  })

  it('reads a store with a missing chunk as incomplete', () => {
    const items = encodeEnvelope(layout, envelope({ list: longList(800) }), {})
    delete items[chunkKey('store', 'list', 1)]

    expectIncomplete(() => decodeEnvelope(layout, items))
  })

  it('reads chunks from two different writes as incomplete', () => {
    const first = chunkKey('store', 'list', 0)
    const before = encodeEnvelope(
      layout,
      envelope({ list: longList(800).reverse() }),
      {}
    )
    const after = encodeEnvelope(layout, envelope({ list: longList(800) }), {})
    const torn = { ...after, [first]: before[first] }

    expectIncomplete(() => decodeEnvelope(layout, torn))
  })

  it('reads a damaged parts record as incomplete', () => {
    expectIncomplete(() => {
      return decodeEnvelope(layout, {
        store: { version: 3, data: {}, parts: { list: { chunks: 'one' } } },
      })
    })
    expectIncomplete(() => {
      return decodeEnvelope(layout, {
        store: { version: 3, data: 'garbage', parts: {} },
      })
    })
  })

  it('joins a part this layout does not name when its chunks are given', () => {
    const newer: StoreLayout = { key: 'store', parts: ['list', 'extra'] }
    const items = encodeEnvelope(newer, envelope({ extra: [1, 2, 3] }), {})

    expect(referencedKeys(layout, items)).toEqual([
      chunkKey('store', 'extra', 0),
    ])
    expect(decodeEnvelope(layout, items)).toEqual(
      envelope({ extra: [1, 2, 3] })
    )
  })
})
