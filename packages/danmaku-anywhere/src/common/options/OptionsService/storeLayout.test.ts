import { describe, expect, it } from 'vitest'
import { chromeItemBytes } from '@/tests/syncQuota'
import { OptionsStorageError } from './OptionsStorageError'
import {
  chunkKey,
  decodeEnvelope,
  encodeEnvelope,
  type StoreLayout,
} from './storeLayout'

/**
 * The storage layout of an option store. A store that fits one sync item is
 * written as that one item. Past the limit, fields named as parts leave the
 * store's item and are cut into string chunks that each fit Chrome's per-item
 * limit as Chrome counts it, never inside a surrogate pair, and decoding joins
 * them back into the same envelope. Chunks the new layout does not use are
 * blanked in the same write, including all of them when the store fits one
 * item again. A missing chunk, chunks from different writes or a damaged parts
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

function chunkKeysOf(items: Record<string, unknown>) {
  return Object.keys(items).filter((key) => key !== 'store')
}

function filledChunkKeysOf(items: Record<string, unknown>) {
  return chunkKeysOf(items).filter((key) => items[key] !== '')
}

function expectIncomplete(read: () => unknown) {
  let error: unknown
  try {
    read()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(OptionsStorageError)
  expect(error).toMatchObject({
    problem: 'options.incomplete',
    store: 'store',
  })
}

describe('encodeEnvelope and decodeEnvelope', () => {
  it('writes a store that fits one item as that item, whatever its parts', () => {
    const stored = envelope({ scalar: 1, list: longList(3), text: 'a{}' })

    const items = encodeEnvelope(layout, stored, {})

    expect(items).toEqual({ store: stored })
    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })

  it('moves the parts of a store past the item limit out and joins them back', () => {
    const stored = envelope({ scalar: 1, list: longList(300), text: 'a{}' })

    const items = encodeEnvelope(layout, stored, {})

    expect(items.store).toEqual({
      version: 3,
      data: { scalar: 1 },
      parts: {
        list: { chunks: expect.any(Number), hash: expect.any(String) },
        text: { chunks: 1, hash: expect.any(String) },
      },
    })
    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })

  it('reads an item without a parts record as it is', () => {
    const stored = envelope({ scalar: 1, list: longList(2), text: 'b' }, 1)

    expect(decodeEnvelope(layout, { store: stored })).toEqual(stored)
    expect(decodeEnvelope(layout, { store: 'garbage' })).toBe('garbage')
    expect(decodeEnvelope(layout, {})).toBeUndefined()
  })

  it('cuts a long part into chunks that each fit the item limit', () => {
    const text = '<b>"弹幕"</b>\\\n\u2028😀'.repeat(1200)
    const stored = envelope({ list: longList(800), text })

    const items = encodeEnvelope(layout, stored, {})

    expect(chunkKeysOf(items).length).toBeGreaterThan(10)
    for (const [key, value] of Object.entries(items)) {
      expect(chromeItemBytes(key, value), key).toBeLessThanOrEqual(PER_ITEM)
    }
    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })

  it('never cuts a surrogate pair in two', () => {
    const stored = envelope({ text: '😀'.repeat(10_000) })

    const items = encodeEnvelope(layout, stored, {})

    const chunks = chunkKeysOf(items).map((key) => items[key] as string)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.isWellFormed()).toBe(true)
    }
  })

  it('blanks the chunks a shorter value no longer uses in the same write', () => {
    const long = encodeEnvelope(layout, envelope({ list: longList(800) }), {})

    const shorter = encodeEnvelope(
      layout,
      envelope({ list: longList(300) }),
      long
    )

    const used = new Set(filledChunkKeysOf(shorter))
    const unused = chunkKeysOf(long).filter((key) => !used.has(key))
    expect(unused.length).toBeGreaterThan(0)
    for (const key of unused) {
      expect(shorter[key]).toBe('')
    }
    expect(decodeEnvelope(layout, { ...long, ...shorter })).toEqual(
      envelope({ list: longList(300) })
    )
  })

  it('writes one item again and blanks every chunk once the store fits', () => {
    const long = encodeEnvelope(layout, envelope({ list: longList(800) }), {})

    const small = encodeEnvelope(layout, envelope({ list: longList(1) }), long)

    expect(small.store).toEqual(envelope({ list: longList(1) }))
    expect(filledChunkKeysOf(small)).toEqual([])
    expect(chunkKeysOf(small).sort()).toEqual(chunkKeysOf(long).sort())
    expect(decodeEnvelope(layout, { ...long, ...small })).toEqual(
      envelope({ list: longList(1) })
    )
  })

  it('blanks chunks of a part this layout does not name', () => {
    const existing = { [chunkKey('store', 'gone', 0)]: '[1]' }

    const items = encodeEnvelope(layout, envelope({ list: [1] }), existing)

    expect(items[chunkKey('store', 'gone', 0)]).toBe('')
  })

  it('writes nothing for chunk keys that hold nothing', () => {
    const items = encodeEnvelope(layout, envelope({ list: [1] }), {
      [chunkKey('store', 'list', 3)]: undefined,
      [chunkKey('store', 'text', 0)]: '',
    })

    expect(Object.keys(items)).toEqual(['store'])
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

  it('joins a part this layout does not name when its chunks are there', () => {
    const newer: StoreLayout = { key: 'store', parts: ['list', 'extra'] }
    const stored = envelope({ extra: longList(300) })
    const items = encodeEnvelope(newer, stored, {})

    expect(decodeEnvelope(layout, items)).toEqual(stored)
  })
})
