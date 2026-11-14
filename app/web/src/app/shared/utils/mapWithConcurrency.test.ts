import { describe, expect, it, vi } from 'vitest'
import { mapWithConcurrency } from './mapWithConcurrency'

/**
 * Each Kazumi rule search opens a browser window in the extension, so the
 * searches run a few at a time. One rule failing must not stop the rest, and
 * results stay in input order.
 */

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('mapWithConcurrency', () => {
  it('keeps results in input order', async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      await new Promise((r) => setTimeout(r, (4 - n) * 5))
      return n * 2
    })

    expect(results).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 6 },
    ])
  })

  it('never runs more than the limit at once', async () => {
    let running = 0
    let peak = 0
    const gates = [deferred(), deferred(), deferred(), deferred()]

    const run = mapWithConcurrency(gates, 2, async (gate) => {
      running++
      peak = Math.max(peak, running)
      await gate.promise
      running--
    })

    await vi.waitFor(() => expect(running).toBe(2))
    gates[0].resolve()
    gates[1].resolve()
    await vi.waitFor(() => expect(peak).toBe(2))
    gates[2].resolve()
    gates[3].resolve()
    await run

    expect(peak).toBe(2)
  })

  it('keeps going after a task rejects', async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) {
        throw new Error('rule failed')
      }
      return n
    })

    expect(results[0]).toEqual({ status: 'fulfilled', value: 1 })
    expect(results[1].status).toBe('rejected')
    expect(results[2]).toEqual({ status: 'fulfilled', value: 3 })
  })

  it('does nothing for an empty list', async () => {
    const task = vi.fn(async () => 1)

    expect(await mapWithConcurrency([], 3, task)).toEqual([])
    expect(task).not.toHaveBeenCalled()
  })
})
