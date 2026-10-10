import { expect, type Page } from '@playwright/test'
import { manifestDisplayName } from '../network/catalog'

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

// Expects the built-ins to carry the names a fresh install seeds in whatever
// language the profile has, and returns them by id. The rename runs after the
// catalog sync, so it can land after the page first renders.
export async function expectBuiltinNamesLocalized(
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
