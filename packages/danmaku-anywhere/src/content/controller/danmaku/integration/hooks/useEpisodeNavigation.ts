import { useCallback } from 'react'
import type {
  IntegrationPolicyNavigation,
  IntegrationPolicySelector,
} from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath } from '@/common/utils/utils'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { sortSelectors } from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'

function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false
  }
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }
  return true
}

export function findFirstVisibleNode(
  selectors: IntegrationPolicySelector[],
  parent: Document = window.document
): HTMLElement | null {
  for (const value of sortSelectors(selectors)) {
    const node = getElementByXpath(value, parent)
    if (node instanceof HTMLElement && isVisible(node)) {
      return node
    }
  }
  return null
}

function triggerNavigation(navigation: IntegrationPolicyNavigation): boolean {
  if (navigation.mode !== 'click') {
    return false
  }
  const target = findFirstVisibleNode(navigation.selectors)
  if (!target) {
    return false
  }
  target.click()
  return true
}

// Ad-break ended events fire on stub clips that are typically much shorter
// than the real episode. Gate auto-advance to videos longer than this.
const AUTO_ADVANCE_MIN_DURATION_SECONDS = 30

export interface UseEpisodeNavigationResult {
  goNext: () => void
  goPrev: () => void
  canGoNext: boolean
  canGoPrev: boolean
  tryAutoAdvance: (videoDuration: number) => void
}

export function useEpisodeNavigation(): UseEpisodeNavigationResult {
  const integration = useActiveIntegration()
  const policy = integration?.policy
  const nextEpisode = policy?.nextEpisode
  const prevEpisode = policy?.prevEpisode
  const isAutoAdvanceEnabled = policy?.options.autoAdvanceOnEnded ?? false

  const canGoNext = nextEpisode !== undefined
  const canGoPrev = prevEpisode !== undefined

  const goNext = useCallback(() => {
    if (!nextEpisode) {
      return
    }
    triggerNavigation(nextEpisode)
  }, [nextEpisode])

  const goPrev = useCallback(() => {
    if (!prevEpisode) {
      return
    }
    triggerNavigation(prevEpisode)
  }, [prevEpisode])

  const tryAutoAdvance = useCallback(
    (videoDuration: number) => {
      if (!isAutoAdvanceEnabled || !nextEpisode) {
        return
      }
      if (videoDuration <= AUTO_ADVANCE_MIN_DURATION_SECONDS) {
        return
      }
      triggerNavigation(nextEpisode)
    },
    [isAutoAdvanceEnabled, nextEpisode]
  )

  return {
    goNext,
    goPrev,
    canGoNext,
    canGoPrev,
    tryAutoAdvance,
  }
}
