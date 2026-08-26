import { describe, expect, it, type Mock, vi } from 'vitest'
import { asVideo, makeVideo } from './fakeVideo'
import { FrameSource, RECOVERY_RETRY_DELAYS_MS } from './frameSource'
import type { AcquireResult, Frame, FrameStrategy } from './frameStrategy'
import type { FramePlan } from './frameStrategyFactory'

const notStale = () => false

const unavailable = {
  status: 'failed',
  failure: { kind: 'unavailable', evidence: 'clone-failed' },
} as const satisfies AcquireResult

const protectedFailure = {
  kind: 'failed',
  failure: { kind: 'protected', evidence: 'encrypted' },
} as const satisfies FramePlan

function frameOf(video: HTMLVideoElement): Frame {
  return { element: video, mediaTime: 0 }
}

function stubStrategy(acquire: Mock): {
  strategy: FrameStrategy
  dispose: Mock
} {
  const dispose = vi.fn()
  return { strategy: { acquire, dispose }, dispose }
}

function resolving(result: AcquireResult): Mock {
  return vi.fn().mockResolvedValue(result)
}

function makeSource(
  createStrategy: (video: HTMLVideoElement) => FramePlan,
  clock: { now: number }
): FrameSource {
  return new FrameSource(() => undefined, {
    createStrategy,
    now: () => clock.now,
  })
}

describe('FrameSource', () => {
  it('reports pending and re-classifies while the video cannot be classified yet', async () => {
    const video = asVideo(makeVideo())
    const createStrategy = vi.fn(
      (): FramePlan => ({
        kind: 'pending',
      })
    )
    const source = makeSource(createStrategy, { now: 0 })

    expect(await source.read(video, notStale)).toEqual({ status: 'pending' })
    expect(await source.read(video, notStale)).toEqual({ status: 'pending' })
    expect(createStrategy).toHaveBeenCalledTimes(2)
  })

  it('keeps the classified strategy across reads', async () => {
    const video = asVideo(makeVideo())
    const { strategy } = stubStrategy(
      resolving({ status: 'frame', frame: frameOf(video) })
    )
    const createStrategy = vi.fn(
      (): FramePlan => ({ kind: 'strategy', strategy })
    )
    const source = makeSource(createStrategy, { now: 0 })

    expect(await source.read(video, notStale)).toEqual({
      status: 'frame',
      frame: frameOf(video),
    })
    await source.read(video, notStale)
    expect(createStrategy).toHaveBeenCalledTimes(1)
  })

  it('re-classifies and disposes the old strategy when the src changes', async () => {
    const original = makeVideo({ currentSrc: 'http://a/v.webm' })
    const video = asVideo(original)
    const first = stubStrategy(
      resolving({ status: 'frame', frame: frameOf(video) })
    )
    const second = stubStrategy(
      resolving({ status: 'frame', frame: frameOf(video) })
    )
    const strategies = [first.strategy, second.strategy]
    const createStrategy = vi.fn(
      (): FramePlan => ({
        kind: 'strategy',
        strategy: strategies.shift() as FrameStrategy,
      })
    )
    const source = makeSource(createStrategy, { now: 0 })

    await source.read(video, notStale)
    original.currentSrc = 'http://b/v.webm'
    await source.read(video, notStale)

    expect(createStrategy).toHaveBeenCalledTimes(2)
    expect(first.dispose).toHaveBeenCalled()
  })

  it('disables a protected video without ever retrying', async () => {
    const video = asVideo(makeVideo())
    const createStrategy = vi.fn((): FramePlan => protectedFailure)
    const clock = { now: 0 }
    const source = makeSource(createStrategy, clock)

    expect(await source.read(video, notStale)).toEqual({
      status: 'disabled',
      failure: protectedFailure.failure,
    })
    clock.now += 600_000
    expect(await source.read(video, notStale)).toEqual({
      status: 'disabled',
      failure: protectedFailure.failure,
    })
    expect(createStrategy).toHaveBeenCalledTimes(1)
  })

  it('retries a recoverable failure only once each backoff has elapsed', async () => {
    const video = asVideo(makeVideo())
    const first = stubStrategy(resolving(unavailable))
    const strategies = [
      first.strategy,
      stubStrategy(resolving(unavailable)).strategy,
      stubStrategy(resolving(unavailable)).strategy,
    ]
    const createStrategy = vi.fn(
      (): FramePlan => ({
        kind: 'strategy',
        strategy: strategies.shift() as FrameStrategy,
      })
    )
    const clock = { now: 0 }
    const source = makeSource(createStrategy, clock)

    expect(await source.read(video, notStale)).toEqual({ status: 'pending' })
    expect(first.dispose).toHaveBeenCalled()

    clock.now = RECOVERY_RETRY_DELAYS_MS[0] - 1
    await source.read(video, notStale)
    expect(createStrategy).toHaveBeenCalledTimes(1)

    clock.now = RECOVERY_RETRY_DELAYS_MS[0]
    await source.read(video, notStale)
    expect(createStrategy).toHaveBeenCalledTimes(2)

    clock.now += RECOVERY_RETRY_DELAYS_MS[1] - 1
    await source.read(video, notStale)
    expect(createStrategy).toHaveBeenCalledTimes(2)

    clock.now += 1
    await source.read(video, notStale)
    expect(createStrategy).toHaveBeenCalledTimes(3)
  })

  it('disables the video once the retries run out', async () => {
    const video = asVideo(makeVideo())
    const createStrategy = vi.fn(
      (): FramePlan => ({
        kind: 'strategy',
        strategy: stubStrategy(resolving(unavailable)).strategy,
      })
    )
    const clock = { now: 0 }
    const source = makeSource(createStrategy, clock)

    let outcome = await source.read(video, notStale)
    for (const delay of RECOVERY_RETRY_DELAYS_MS) {
      expect(outcome).toEqual({ status: 'pending' })
      clock.now += delay
      outcome = await source.read(video, notStale)
    }
    expect(outcome).toEqual({
      status: 'disabled',
      failure: unavailable.failure,
    })
  })

  it('recovers when a later attempt succeeds', async () => {
    const video = asVideo(makeVideo())
    const strategies = [
      stubStrategy(resolving(unavailable)).strategy,
      stubStrategy(resolving({ status: 'frame', frame: frameOf(video) }))
        .strategy,
    ]
    const createStrategy = vi.fn(
      (): FramePlan => ({
        kind: 'strategy',
        strategy: strategies.shift() as FrameStrategy,
      })
    )
    const clock = { now: 0 }
    const source = makeSource(createStrategy, clock)

    expect(await source.read(video, notStale)).toEqual({ status: 'pending' })
    clock.now += RECOVERY_RETRY_DELAYS_MS[0]

    expect(await source.read(video, notStale)).toEqual({
      status: 'frame',
      frame: frameOf(video),
    })
  })

  it('drops a frame that arrives after the read went stale', async () => {
    const video = asVideo(makeVideo())
    const { strategy, dispose } = stubStrategy(
      resolving({ status: 'frame', frame: frameOf(video) })
    )
    const source = makeSource(() => ({ kind: 'strategy', strategy }), {
      now: 0,
    })

    expect(await source.read(video, () => true)).toEqual({ status: 'pending' })
    expect(dispose).toHaveBeenCalled()
  })

  it('re-classifies from scratch after a reset', async () => {
    const video = asVideo(makeVideo())
    const { strategy, dispose } = stubStrategy(
      resolving({ status: 'frame', frame: frameOf(video) })
    )
    const createStrategy = vi.fn(
      (): FramePlan => ({ kind: 'strategy', strategy })
    )
    const source = makeSource(createStrategy, { now: 0 })

    await source.read(video, notStale)
    source.reset()
    await source.read(video, notStale)

    expect(dispose).toHaveBeenCalled()
    expect(createStrategy).toHaveBeenCalledTimes(2)
  })

  it('drops the result of a strategy that was reset mid-acquire', async () => {
    const video = asVideo(makeVideo())
    let finish: (result: AcquireResult) => void = () => undefined
    const acquire = vi.fn(
      () =>
        new Promise<AcquireResult>((resolve) => {
          finish = resolve
        })
    )
    const { strategy, dispose } = stubStrategy(acquire)
    const source = makeSource(() => ({ kind: 'strategy', strategy }), {
      now: 0,
    })

    const reading = source.read(video, notStale)
    source.reset()
    finish({ status: 'frame', frame: frameOf(video) })

    expect(await reading).toEqual({ status: 'pending' })
    expect(dispose).toHaveBeenCalled()
  })
})
