import { type BrowserContext, expect, type Page } from '@playwright/test'
import { manifestDisplayName } from '../network/catalog'
import { Popup } from '../pom/Popup'

const BUILTIN_IDS = ['dandanplay', 'bilibili', 'tencent']

interface StoredBuiltinNames {
  lang: string
  names: Record<string, string>
}

async function readBuiltinNames(page: Page): Promise<StoredBuiltinNames> {
  return page.evaluate(async (ids) => {
    const stored = await chrome.storage.sync.get([
      'extensionOptions',
      'providerConfig',
    ])
    const options = stored.extensionOptions as { data: { lang: string } }
    const configs = stored.providerConfig as {
      data: Array<{ id: string; name: string }>
    }
    const names: Record<string, string> = {}
    for (const config of configs.data) {
      if (ids.includes(config.id)) {
        names[config.id] = config.name
      }
    }
    return { lang: options.data.lang, names }
  }, BUILTIN_IDS)
}

// The rename runs after the catalog sync, so it can land after the page first
// renders.
async function expectStoredNamesLocalized(
  page: Page
): Promise<Record<string, string>> {
  const { lang } = await readBuiltinNames(page)
  const expected = Object.fromEntries(
    BUILTIN_IDS.map((id) => [id, manifestDisplayName(id, lang)])
  )
  await expect
    .poll(
      async () => {
        return (await readBuiltinNames(page)).names
      },
      { message: `built-in names localized for ${lang}` }
    )
    .toEqual(expected)
  return expected
}

// v1.5.0 stored the built-in names as English literals. After an upgrade or a
// restore of its backup they must match what a fresh install seeds in the
// profile's language, on the providers page and optionally on the library's
// season chips.
//
// Detached skips the popup's last-route restore, which would otherwise pull a
// new page over to whatever tab an earlier step left open.
export async function assertBuiltinNamesLocalized(
  context: BrowserContext,
  extensionId: string,
  options: { seasonChips: boolean }
): Promise<void> {
  const page = await context.newPage()
  const popup = await Popup.open(page, extensionId, '/providers', {
    detached: true,
  })
  const names = await expectStoredNamesLocalized(page)
  for (const name of Object.values(names)) {
    await expect(popup.providers.row(name).first()).toBeVisible()
  }

  if (!options.seasonChips) {
    await page.close()
    return
  }
  await Popup.open(page, extensionId, '/mount', { detached: true })
  await expect(
    popup.mount
      .seasonItems()
      .getByText(names.dandanplay, { exact: true })
      .first()
  ).toBeVisible()
  await page.close()
}
