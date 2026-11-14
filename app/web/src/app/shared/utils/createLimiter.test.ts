import { describe, expect, it, vi } from 'vitest'
import { createLimiter } from './createLimiter'

/**
 * Searches arrive from several callers over time rather than as one list, so
 * the limit has to live in a shared gate. A failing task must give its slot
 * back.
 */

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('createLimiter', () => {
  it('never runs more than the limit at once', async () => {
    const limit = createLimiter(2)
    const gates = [deferred(), deferred(), deferred()]
    let running = 0
    let peak = 0

    const runs = gates.map((gate) =>
      limit(async () => {
        running++
        peak = Math.max(peak, running)
        await gate.promise
        running--
      })
    )

    await vi.waitFor(() => expect(running).toBe(2))
    gates[0].resolve()
    await vi.waitFor(() => expect(running).toBe(2))
    gates[1].resolve()
    gates[2].resolve()
    await Promise.all(runs)

    expect(peak).toBe(2)
  })

  it('releases the slot when a task rejects', async () => {
    const limit = createLimiter(1)
    const gate = deferred()
    let running = 0

    const first = limit(async () => {
      running++
      await gate.promise
      running--
      throw new Error('search failed')
    })
    const second = limit(async () => {
      running++
      await gate.promise
      running--
      return 'ok'
    })

    await vi.waitFor(() => expect(running).toBe(1))
    gate.resolve()

    await expect(first).rejects.toThrow('search failed')
    await expect(second).resolves.toBe('ok')
  })
})
