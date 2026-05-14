import type { Page } from '@playwright/test'

// Open the popup at a specific hash route. The popup defaults to /mount; most
// specs want /search.
export async function openPopup(
  page: Page,
  extensionId: string,
  hashRoute = '/search'
): Promise<void> {
  await page.goto(
    `chrome-extension://${extensionId}/pages/popup.html#${hashRoute}`
  )
  await page.locator('#root').waitFor({ state: 'visible', timeout: 10_000 })
}

// Submit the search form. Pressing Enter on the input avoids fighting the
// Autocomplete dropdown that intercepts pointer events on the submit button.
export async function submitSearch(page: Page, term: string): Promise<void> {
  const input = page.getByTestId('search-input')
  await input.fill(term)
  await input.press('Enter')
}
