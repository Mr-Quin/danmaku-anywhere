import type {
  IntegrationPolicy,
  IntegrationPolicySelector,
} from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath } from '@/common/utils/utils'
import { sortSelectors } from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'
import type { MediaElements } from '../observers/MediaObserver'

function matchFirstNode(
  xpathSelectors: IntegrationPolicySelector[],
  parent = window.document
) {
  for (const p of sortSelectors(xpathSelectors)) {
    const element = getElementByXpath(p, parent)
    if (element) {
      return element
    }
  }
  return null
}

export function matchNodesByXPathPolicy(
  policy: IntegrationPolicy
): MediaElements | null {
  const titleElement = matchFirstNode(policy.title.selector)

  if (!titleElement) {
    return null
  }

  return {
    title: titleElement,
    episode: matchFirstNode(policy.episode.selector),
    season: matchFirstNode(policy.season.selector),
    episodeTitle: matchFirstNode(policy.episodeTitle.selector),
  }
}
