import { describe, expect, it, vi } from 'vitest'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { MediaObserver } from './MediaObserver'

class TestObserver extends MediaObserver {
  public override readonly name = 'TestObserver'

  constructor() {
    super()
  }

  setup() {
    // noop
  }

  run() {
    // noop
  }

  reset() {
    // noop
  }

  // Expose protected methods for testing
  public testUpdateMediaInfo(mediaInfo: MediaInfo) {
    this.updateMediaInfo(mediaInfo)
  }

  public testUpdateStatus(status: string) {
    this.updateStatus(status)
  }

  public testEmit(
    event: Parameters<typeof this.emit>[0],
    ...args: Parameters<typeof this.emit> extends [any, ...infer R] ? R : never
  ) {
    this.emit(event, ...args)
  }
}

function makeMediaInfo(title: string, episode = 1, season?: string): MediaInfo {
  return new MediaInfo({
    title,
    episode,
    seasonDecorator: season,
  })
}

describe('MediaObserver', () => {
  describe('event system', () => {
    it('delivers events to subscribed handlers', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      observer.on({ statusChange: handler })
      observer.testEmit('statusChange', 'test status')

      expect(handler).toHaveBeenCalledWith('test status')
    })

    it('supports multiple handlers for the same event', () => {
      const observer = new TestObserver()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      observer.on({ statusChange: handler1 })
      observer.on({ statusChange: handler2 })
      observer.testEmit('statusChange', 'test')

      expect(handler1).toHaveBeenCalledWith('test')
      expect(handler2).toHaveBeenCalledWith('test')
    })

    it('supports subscribing to multiple events at once', () => {
      const observer = new TestObserver()
      const statusHandler = vi.fn()
      const errorHandler = vi.fn()

      observer.on({
        statusChange: statusHandler,
        error: errorHandler,
      })

      observer.testEmit('statusChange', 'status')
      observer.testEmit('error', new Error('test error'))

      expect(statusHandler).toHaveBeenCalledWith('status')
      expect(errorHandler).toHaveBeenCalledWith(new Error('test error'))
    })

    it('off() removes a specific listener', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      observer.on({ statusChange: handler })
      observer.off('statusChange', handler)
      observer.testEmit('statusChange', 'test')

      expect(handler).not.toHaveBeenCalled()
    })

    it('off() does not throw for unsubscribed events', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      expect(() => {
        observer.off('statusChange', handler)
      }).not.toThrow()
    })

    it('does not emit to unrelated event handlers', () => {
      const observer = new TestObserver()
      const statusHandler = vi.fn()

      observer.on({ statusChange: statusHandler })
      observer.testEmit('error', new Error('test'))

      expect(statusHandler).not.toHaveBeenCalled()
    })

    it('destroy() clears all subscriptions', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      observer.on({ statusChange: handler })
      observer.destroy()
      observer.testEmit('statusChange', 'test')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('updateMediaInfo', () => {
    it('emits mediaChange with the MediaInfo', () => {
      const observer = new TestObserver()
      const handler = vi.fn()
      const info = makeMediaInfo('Test Anime')

      observer.on({ mediaChange: handler })
      observer.testUpdateMediaInfo(info)

      expect(handler).toHaveBeenCalledWith(info)
    })

    it('does not re-emit when MediaInfo equals previous', () => {
      const observer = new TestObserver()
      const handler = vi.fn()
      const info1 = makeMediaInfo('Test Anime', 1)
      const info2 = makeMediaInfo('Test Anime', 1)

      observer.on({ mediaChange: handler })
      observer.testUpdateMediaInfo(info1)
      observer.testUpdateMediaInfo(info2)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('re-emits when MediaInfo differs', () => {
      const observer = new TestObserver()
      const handler = vi.fn()
      const info1 = makeMediaInfo('Test Anime', 1)
      const info2 = makeMediaInfo('Test Anime', 2)

      observer.on({ mediaChange: handler })
      observer.testUpdateMediaInfo(info1)
      observer.testUpdateMediaInfo(info2)

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenNthCalledWith(2, info2)
    })

    it('re-emits when season differs', () => {
      const observer = new TestObserver()
      const handler = vi.fn()
      const info1 = makeMediaInfo('Test Anime', 1, 'S1')
      const info2 = makeMediaInfo('Test Anime', 1, 'S2')

      observer.on({ mediaChange: handler })
      observer.testUpdateMediaInfo(info1)
      observer.testUpdateMediaInfo(info2)

      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('updateStatus', () => {
    it('emits statusChange with the status string', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      observer.on({ statusChange: handler })
      observer.testUpdateStatus('Loading...')

      expect(handler).toHaveBeenCalledWith('Loading...')
    })

    it('does not re-emit when status is unchanged', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      observer.on({ statusChange: handler })
      observer.testUpdateStatus('Loading...')
      observer.testUpdateStatus('Loading...')

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('re-emits when status changes', () => {
      const observer = new TestObserver()
      const handler = vi.fn()

      observer.on({ statusChange: handler })
      observer.testUpdateStatus('Loading...')
      observer.testUpdateStatus('Done')

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenNthCalledWith(2, 'Done')
    })
  })
})
