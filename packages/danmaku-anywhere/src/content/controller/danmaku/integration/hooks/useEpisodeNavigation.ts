import { useCallback } from 'react'
import type { IntegrationPolicySelector } from '@/common/options/integrationPolicyStore/schema'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { sortSelectors } from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'

type ClickableElement = HTMLElement | SVGElement

function* iterateXpathMatches(
  xpath: string,
  parent: Document = window.document
): Generator<Node> {
  let result: XPathResult
  try {
    result = document.evaluate(
      xpath,
      parent,
      null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null
    )
  } catch {
    return
  }
  let node = result.iterateNext()
  while (node) {
    yield node
    node = result.iterateNext()
  }
}

function isVisible(element: ClickableElement): boolean {
  if (!element.isConnected) {
    return false
  }
  if (element instanceof HTMLButtonElement && element.disabled) {
    return false
  }
  // Walk up the tree — display:none / opacity:0 on an ancestor doesn't
  // propagate into the element's own computed style, and visibility:hidden
  // on an ancestor can be overridden lower down. Stop at <html>.
  let current: Element | null = element
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

function isClickable(node: Node): node is ClickableElement {
  return node instanceof HTMLElement || node instanceof SVGElement
}

export function findFirstVisibleNode(
  selectors: IntegrationPolicySelector[],
  parent: Document = window.document
): ClickableElement | null {
  for (const xpath of sortSelectors([...selectors])) {
    for (const node of iterateXpathMatches(xpath, parent)) {
      if (isClickable(node) && isVisible(node)) {
        return node
      }
    }
  }
  return null
}

export function clickFirstVisible(
  selectors: IntegrationPolicySelector[]
): boolean {
  const target = findFirstVisibleNode(selectors)
  if (!target) {
    return false
  }
  // dispatchEvent works for both HTMLElement and SVGElement; some TS lib
  // versions don't expose .click() on SVGElement even though browsers do.
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true })
  )
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
