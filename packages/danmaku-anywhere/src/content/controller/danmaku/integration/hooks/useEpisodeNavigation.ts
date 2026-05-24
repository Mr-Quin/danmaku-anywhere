import { useCallback } from 'react'
import type { IntegrationPolicySelector } from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath } from '@/common/utils/utils'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { sortSelectors } from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'

function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false
  }
  if (element instanceof HTMLButtonElement && element.disabled) {
    return false
  }
  // Walk up the tree — display:none / opacity:0 on an ancestor doesn't
  // propagate into the element's own computed style, and visibility:hidden
  // on an ancestor can be overridden lower down. Stop at <html>.
  let current: HTMLElement | null = element
  while (current) {
    const style = window.getComputedStyle(current)
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return false
    }
    current = current.parentElement
  }
  return true
}

export function findFirstVisibleNode(
  selectors: IntegrationPolicySelector[],
  parent: Document = window.document
): HTMLElement | null {
  for (const xpath of sortSelectors([...selectors])) {
    const node = getElementByXpath(xpath, parent)
    if (node instanceof HTMLElement && isVisible(node)) {
      return node
    }
  }
  return null
}

function clickFirstVisible(selectors: IntegrationPolicySelector[]): boolean {
  const target = findFirstVisibleNode(selectors)
  if (!target) {
    return false
  }
  target.click()
  return true
}

export function shouldAutoAdvance(
  enabled: boolean,
  canGoNext: boolean,
  videoDuration: number,
  minDuration: number
): boolean {
  if (!enabled || !canGoNext) {
    return false
  }
  return videoDuration > minDuration
}

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
  // policy.options.minVideoDuration is schema-defaulted, but the whole policy
  // may be absent when no integration is active.
  const minDuration = policy?.options.minVideoDuration ?? 30

  const canGoNext = nextEpisode !== undefined
  const canGoPrev = prevEpisode !== undefined

  const goNext = useCallback(() => {
    if (!nextEpisode) {
      return
    }
    clickFirstVisible(nextEpisode)
  }, [nextEpisode])

  const goPrev = useCallback(() => {
    if (!prevEpisode) {
      return
    }
    clickFirstVisible(prevEpisode)
  }, [prevEpisode])

  const tryAutoAdvance = useCallback(
    (videoDuration: number) => {
      if (
        !shouldAutoAdvance(
          isAutoAdvanceEnabled,
          nextEpisode !== undefined,
          videoDuration,
          minDuration
        )
      ) {
        return
      }
      if (!nextEpisode) {
        return
      }
      clickFirstVisible(nextEpisode)
    },
    [isAutoAdvanceEnabled, nextEpisode, minDuration]
  )

  return {
    goNext,
    goPrev,
    canGoNext,
    canGoPrev,
    tryAutoAdvance,
  }
}
