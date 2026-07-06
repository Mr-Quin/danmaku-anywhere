import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { isCustomEpisode } from '@/common/danmaku/utils'

// Stored episodes no longer carry a provider tag, so discriminate custom
// episodes structurally; older web apps still tag them provider: 'Custom' on
// the wire, so honor that too.
export function isCustomDanmakuGetPayload(data: GenericEpisodeLite): boolean {
  const legacyTag = (data as { provider?: unknown }).provider
  return legacyTag === 'Custom' || isCustomEpisode(data)
}
