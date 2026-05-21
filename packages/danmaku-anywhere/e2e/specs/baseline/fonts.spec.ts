import type { Page } from '@playwright/test'
import { expect, test } from '../../setup/fixtures'

/**
 * Bundled variable fonts load from the extension origin in popup and
 * dashboard. Each family is probed with a representative glyph and must
 * resolve at least one FontFace; FontFaceSet.load rejects (or resolves
 * empty) if the CSS 404s or the woff2 src fails. Regression guard against
 * font-CSS being bundled with /assets/ paths that don't resolve outside
 * extension-origin pages.
 */

const FONT_PROBES = [
  { family: 'Plus Jakarta Sans Variable', glyph: 'A' },
  { family: 'Noto Sans SC Variable', glyph: '简' },
  { family: 'Noto Sans TC Variable', glyph: '繁' },
  { family: 'Noto Sans JP Variable', glyph: 'あ' },
] as const

async function assertFontsAvailable(page: Page): Promise<void> {
  await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 })
  for (const probe of FONT_PROBES) {
    const loadedCount = await page.evaluate(async ({ family, glyph }) => {
      const faces = await document.fonts.load(`1em "${family}"`, glyph)
      return faces.length
    }, probe)
    expect(
      loadedCount,
      `${probe.family} face for "${probe.glyph}"`
    ).toBeGreaterThan(0)
  }
}

test('popup loads bundled variable fonts', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`)
  await assertFontsAvailable(page)
})

test('dashboard loads bundled variable fonts', async ({
  page,
  extensionId,
}) => {
  await page.goto(`chrome-extension://${extensionId}/pages/dashboard.html`)
  await assertFontsAvailable(page)
})
