import type { MediaInfo } from '@danmaku-anywhere/web-scraper'
import { lastValueFrom } from 'rxjs'
import type { ExtensionMessagingService } from '../../../core/extension/extension-messaging.service'

// The header rules the extension installs for the videos of the episode being
// watched: one per video origin, all removed together when the episode is left.
export class MediaHeaderRules {
  private readonly ruleIds = new Map<string, Promise<number | undefined>>()

  constructor(private readonly messaging: ExtensionMessagingService) {}

  ensure(episodeUrl: string, media: MediaInfo): Promise<number | undefined> {
    const videoOrigin = new URL(media.src).origin
    const existing = this.ruleIds.get(videoOrigin)
    if (existing) {
      return existing
    }

    const origin = new URL(episodeUrl).origin
    const ruleId = lastValueFrom(
      this.messaging.single('setRequestHeaders', {
        url: videoOrigin,
        referer: origin,
        origin,
      })
    ).catch((err: unknown) => {
      if (this.ruleIds.get(videoOrigin) === ruleId) {
        this.ruleIds.delete(videoOrigin)
      }
      throw err
    })
    this.ruleIds.set(videoOrigin, ruleId)
    return ruleId
  }

  async releaseAll(): Promise<void> {
    const pending = [...this.ruleIds.values()]
    this.ruleIds.clear()

    await Promise.all(
      pending.map(async (installed) => {
        const ruleId = await installed.catch(() => undefined)
        if (ruleId === undefined) {
          return
        }
        await lastValueFrom(
          this.messaging.single('removeRequestHeaders', { ruleId })
        )
      })
    )
  }
}
