import type { ComponentFixture } from '@angular/core/testing'

import type { ShowCardData } from '../../features/bangumi/components/show-card'

// Minimal ShowCardData factory for component specs that render cards or feed
// the lane store. Overrides win over the defaults.
export function makeShowCard(over: Partial<ShowCardData> = {}): ShowCardData {
  return {
    id: 1455,
    altTitle: '葬送のフリーレン',
    title: '葬送的芙莉莲',
    air_date: '2026-01-01',
    eps: 28,
    rating: { score: 9.1, total: 1000 },
    rank: 1,
    cover: '/fake-cover.svg',
    ...over,
  }
}

// Returns the first element carrying the given data-testid, or null.
export function byTestId<T extends Element = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  testId: string
): T | null {
  return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)
}

// Returns every element carrying the given data-testid.
export function allByTestId<T extends Element = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  testId: string
): T[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`)
  )
}

// Clicks the first element with the given data-testid and flushes change
// detection. Throws if the element is absent so a stale selector fails loudly.
export async function harnessClick(
  fixture: ComponentFixture<unknown>,
  testId: string
): Promise<void> {
  const el = byTestId<HTMLElement>(fixture, testId)
  if (!el) {
    throw new Error(`harnessClick: no element with data-testid="${testId}"`)
  }
  el.click()
  await fixture.whenStable()
}
