import { describe, expect, it, vi } from 'vitest'
import { createTaskQueue } from './taskQueue'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('createTaskQueue', () => {
  it('runs tasks sequentially (FIFO) even if they resolve out of order naturally', async () => {
    const q = createTaskQueue()
    const order: number[] = []

    const task1 = vi.fn(async () => {
      await wait(30)
      order.push(1)
      return 'a'
    })

    const task2 = vi.fn(async () => {
      await wait(0)
      order.push(2)
      return 'b'
    })

    const t1 = q.run(task1)
    const t2 = q.run(task2)

    await expect(t1).resolves.toBe('a')
    await expect(t2).resolves.toBe('b')

    expect(order).toEqual([1, 2])
    expect(task1).toHaveBeenCalledTimes(1)
    expect(task2).toHaveBeenCalledTimes(1)
  })

  it('propagates errors for the failing task but continues with subsequent tasks', async () => {
    const q = createTaskQueue()
    const calls: string[] = []

    const ok1 = () => {
      calls.push('ok1')
      return 1
    }
    const fail = () => {
      calls.push('fail')
      throw new Error('boom')
    }
    const ok2 = () => {
      calls.push('ok2')
      return 2
    }

    const p1 = q.run(ok1)
    const p2 = q.run(fail)
    const p3 = q.run(ok2)

    await expect(p1).resolves.toBe(1)
    await expect(p2).rejects.toThrow('boom')
    await expect(p3).resolves.toBe(2)

    expect(calls).toEqual(['ok1', 'fail', 'ok2'])
  })

  it('supports synchronous functions and non-Promise return values', async () => {
    const q = createTaskQueue()
    const result = await q.run(() => 42)
    expect(result).toBe(42)
  })

  it('executes tasks added while one is running (queued next after current completes)', async () => {
    const q = createTaskQueue()
    const log: string[] = []

    const p1 = q.run(async () => {
      log.push('t1-start')
      // Enqueue another task while running
      q.run(async () => {
        log.push('t2')
        return 'inner'
      })
      await wait(10)
      log.push('t1-end')
      return 'done'
    })

    const p3 = q.run(async () => {
      log.push('t3')
      return 't3'
    })

    await expect(p1).resolves.toBe('done')
    await expect(p3).resolves.toBe('t3')
    // Tasks enqueued during t1 are appended after the current tail at enqueue time.
    // Since t3 was queued before t2 (t2 added inside t1's execution), t3 runs before t2.
    expect(log).toEqual(['t1-start', 't1-end', 't3', 't2'])
  })
})
