import { type BrowserContext, expect, type Page } from '@playwright/test'
import { manifestDisplayName } from '../network/catalog'
import { Popup } from '../pom/Popup'

const BUILTIN_IDS = ['dandanplay', 'bilibili', 'tencent']

interface StoredBuiltinNames {
  lang: string
  customNames: Record<string, string | null>
}

async function readBuiltinNames(page: Page): Promise<StoredBuiltinNames> {
  return page.evaluate(async (ids) => {
    const stored = await chrome.storage.sync.get([
      'extensionOptions',
      'providerConfig',
    ])
    const options = stored.extensionOptions as { data: { lang: string } }
    const configs = stored.providerConfig as {
      data: Array<{ id: string; customName: string | null }>
    }
    const customNames: Record<string, string | null> = {}
    for (const config of configs.data) {
      if (ids.includes(config.id)) {
        customNames[config.id] = config.customName
      }
    }
    return { lang: options.data.lang, customNames }
  }, BUILTIN_IDS)
}

// v1.5.0 stored the built-in names as English literals. After an upgrade or a
// restore of its backup the built-ins are on their default names, which show
// in the profile's language on the providers page and optionally on the
// library's season chips.
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
  const { lang, customNames } = await readBuiltinNames(page)
  expect(customNames).toEqual(
    Object.fromEntries(BUILTIN_IDS.map((id) => [id, null]))
  )
  const names = Object.fromEntries(
    BUILTIN_IDS.map((id) => [id, manifestDisplayName(id, lang)])
  )
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
