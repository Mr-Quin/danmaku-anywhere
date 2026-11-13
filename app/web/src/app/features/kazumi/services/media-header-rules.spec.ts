import type { MediaInfo } from '@danmaku-anywhere/web-scraper'
import { of, throwError } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExtensionMessagingService } from '../../../core/extension/extension-messaging.service'
import { MediaHeaderRules } from './media-header-rules'

/**
 * The detail page asks the extension for a header rule per video origin while
 * an episode plays and hands every rule back when the episode is left, so DNR
 * session rules do not pile up for the rest of the browser session.
 */

const EPISODE_URL = 'https://watch.example.com/show/ep1'

function media(src: string): MediaInfo {
  return { src, contentType: 'video/mp4' } as MediaInfo
}

describe('MediaHeaderRules', () => {
  let single: ReturnType<typeof vi.fn>
  let rules: MediaHeaderRules
  let nextRuleId: number

  beforeEach(() => {
    nextRuleId = 1
    single = vi.fn((action: string) => {
      if (action === 'setRequestHeaders') {
        return of(nextRuleId++)
      }
      return of(undefined)
    })
    rules = new MediaHeaderRules({
      single,
    } as unknown as ExtensionMessagingService)
  })

  it('installs one rule per video origin with the episode origin as referer', async () => {
    await rules.ensure(EPISODE_URL, media('https://cdn.example.com/a.mp4'))
    await rules.ensure(EPISODE_URL, media('https://cdn.example.com/b.mp4'))
    await rules.ensure(EPISODE_URL, media('https://other.example.com/c.mp4'))

    const installs = single.mock.calls.filter(
      ([action]) => action === 'setRequestHeaders'
    )
    expect(installs).toEqual([
      [
        'setRequestHeaders',
        {
          url: 'https://cdn.example.com',
          referer: 'https://watch.example.com',
          origin: 'https://watch.example.com',
        },
      ],
      [
        'setRequestHeaders',
        {
          url: 'https://other.example.com',
          referer: 'https://watch.example.com',
          origin: 'https://watch.example.com',
        },
      ],
    ])
  })

  it('removes every installed rule on release and installs afresh afterwards', async () => {
    await rules.ensure(EPISODE_URL, media('https://cdn.example.com/a.mp4'))
    await rules.ensure(EPISODE_URL, media('https://other.example.com/c.mp4'))

    await rules.releaseAll()

    const removals = single.mock.calls.filter(
      ([action]) => action === 'removeRequestHeaders'
    )
    expect(removals).toEqual([
      ['removeRequestHeaders', { ruleId: 1 }],
      ['removeRequestHeaders', { ruleId: 2 }],
    ])

    await rules.ensure(EPISODE_URL, media('https://cdn.example.com/a.mp4'))
    expect(single).toHaveBeenLastCalledWith(
      'setRequestHeaders',
      expect.objectContaining({ url: 'https://cdn.example.com' })
    )
  })

  it('does not ask an extension that returned no rule id to remove anything', async () => {
    single.mockImplementation(() => of(undefined))

    await rules.ensure(EPISODE_URL, media('https://cdn.example.com/a.mp4'))
    await rules.releaseAll()

    expect(single).toHaveBeenCalledTimes(1)
    expect(single).toHaveBeenCalledWith('setRequestHeaders', expect.anything())
  })

  it('retries an install that failed instead of caching the failure', async () => {
    single.mockImplementationOnce(() => throwError(() => new Error('down')))

    await expect(
      rules.ensure(EPISODE_URL, media('https://cdn.example.com/a.mp4'))
    ).rejects.toThrow('down')
    await expect(
      rules.ensure(EPISODE_URL, media('https://cdn.example.com/a.mp4'))
    ).resolves.toBe(1)

    await rules.releaseAll()
    expect(single).toHaveBeenLastCalledWith('removeRequestHeaders', {
      ruleId: 1,
    })
  })
})
