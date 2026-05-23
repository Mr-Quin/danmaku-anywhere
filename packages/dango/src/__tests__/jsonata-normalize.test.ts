import { describe, expect, it } from 'vitest'
import { JsonataEvaluator } from '../engine/jsonata-eval.js'

function withSequence<T>(arr: T[]): T[] {
  Object.defineProperty(arr, 'sequence', {
    value: true,
    enumerable: true,
    configurable: true,
  })
  return arr
}

describe('normalize (via JsonataEvaluator)', () => {
  it('strips the sequence marker on the top-level array', async () => {
    const ev = new JsonataEvaluator()
    const result = (await ev.eval('items[value > 0]', {
      items: [{ value: 1 }, { value: 0 }, { value: 2 }],
    })) as unknown[]

    expect(result).toEqual([{ value: 1 }, { value: 2 }])
    expect(
      (result as unknown as Record<string, unknown>).sequence
    ).toBeUndefined()
  })

  it('strips markers on arrays nested inside an object', async () => {
    const ev = new JsonataEvaluator()
    const result = (await ev.eval('{ "kept": items[value > 0] }', {
      items: [{ value: 1 }, { value: 0 }, { value: 2 }],
    })) as { kept: unknown[] }

    expect(result.kept).toEqual([{ value: 1 }, { value: 2 }])
    expect(
      (result.kept as unknown as Record<string, unknown>).sequence
    ).toBeUndefined()
  })

  it('returns the same reference when no markers are present', async () => {
    const rows = [{ a: 1 }, { a: 2 }, { a: 3 }]
    const wrapped = { rows }
    const ev = new JsonataEvaluator()
    const result = (await ev.eval('$', wrapped)) as typeof wrapped

    expect(result).toBe(wrapped)
    expect(result.rows).toBe(rows)
  })

  it('does not allocate new row objects when only the outer array has the marker', async () => {
    const rows = [{ a: 1 }, { a: 2 }]
    const seq = withSequence(rows.slice())
    const ev = new JsonataEvaluator()
    const out = (await ev.eval('$', seq)) as Array<{ a: number }>

    expect(out).toEqual(rows)
    expect(out).not.toBe(seq) // outer cloned to drop marker
    expect(out[0]).toBe(rows[0]) // row references preserved
    expect(out[1]).toBe(rows[1])
  })
})
