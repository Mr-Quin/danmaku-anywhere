import { expect, type Page } from '@playwright/test'
import { z } from 'zod'
import { DANMAKU_DB_NAME } from '../../src/common/db/db'
import { zAiProviderConfig } from '../../src/common/options/aiProviderConfig/schema'
import { extensionOptionsSchema } from '../../src/common/options/extensionOptions/schema'
import { zIntegration } from '../../src/common/options/integrationPolicyStore/schema'
import { namingRuleOptionsSchema } from '../../src/common/options/localMatchingRule/schema'
import { mountConfigInputListSchema } from '../../src/common/options/mountConfig/schema'
import { decodeEnvelope } from '../../src/common/options/OptionsService/storeLayout'
import { OPTION_STORES as OPTION_STORE_LAYOUTS } from '../../src/common/options/optionStores'
import { providerConfigSchema } from '../../src/common/options/providerConfig/schema'

const OPTION_STORES = {
  extensionOptions: { area: 'sync', key: 'extensionOptions' },
  danmakuOptions: { area: 'sync', key: 'danmakuOptions' },
  providerConfig: { area: 'sync', key: 'providerConfig' },
  aiProviderConfig: { area: 'sync', key: 'aiProviderConfig' },
  mountConfig: { area: 'sync', key: 'mountConfig' },
  integrationPolicy: { area: 'local', key: 'xpathPolicy' },
  localMatchingRule: { area: 'local', key: 'localMatchingRule' },
} as const

export type OptionStoreName = keyof typeof OPTION_STORES

export interface StoredOptions {
  version: number
  data: unknown
}

export type OptionsSnapshot = Partial<Record<OptionStoreName, StoredOptions>>

// danmakuOptions has no zod schema, so it is checked by value only.
const CURRENT_SCHEMAS: Partial<Record<OptionStoreName, z.ZodType>> = {
  extensionOptions: extensionOptionsSchema,
  providerConfig: z.array(providerConfigSchema),
  aiProviderConfig: z.array(zAiProviderConfig),
  mountConfig: mountConfigInputListSchema,
  integrationPolicy: z.array(zIntegration),
  localMatchingRule: namingRuleOptionsSchema,
}

export async function readOptionsSnapshot(
  page: Page
): Promise<OptionsSnapshot> {
  const areas = await page.evaluate(async () => {
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(null),
    ])
    return { sync, local }
  })
  const out: OptionsSnapshot = {}
  for (const [name, { area, key }] of Object.entries(OPTION_STORES)) {
    const layout = OPTION_STORE_LAYOUTS.find((store) => store.key === key)
    const envelope = decodeEnvelope({ key, parts: layout?.parts }, areas[area])
    if (envelope !== undefined) {
      out[name as OptionStoreName] = envelope
    }
  }
  return out
}

// Maps each store that is missing or fails its current schema to the zod
// issues, so a passing upgrade is an empty object.
//
// The mount config pattern check asks chrome.permissions, which only exists
// inside the extension, so it is answered by the given extension page.
export async function schemaViolations(
  page: Page,
  snapshot: OptionsSnapshot
): Promise<Record<string, string[]>> {
  const contains = (permissions: chrome.permissions.Permissions) => {
    return page.evaluate((p) => chrome.permissions.contains(p), permissions)
  }
  const global = globalThis as { chrome?: unknown }
  const previous = global.chrome
  global.chrome = { permissions: { contains } }
  try {
    return await collectViolations(snapshot)
  } finally {
    global.chrome = previous
  }
}

async function collectViolations(
  snapshot: OptionsSnapshot
): Promise<Record<string, string[]>> {
  const violations: Record<string, string[]> = {}
  for (const [name, schema] of Object.entries(CURRENT_SCHEMAS)) {
    const stored = snapshot[name as OptionStoreName]
    if (!stored) {
      violations[name] = ['store missing']
      continue
    }
    const result = await schema.safeParseAsync(stored.data)
    if (!result.success) {
      violations[name] = result.error.issues.map((issue) => {
        return `${issue.path.join('.')}: ${issue.message}`
      })
    }
  }
  return violations
}

// The background turns showReleaseNotes on after an update, and the popup then
// shows a What's New dialog over every route until it is dismissed. The flag
// can land well after the popup has mounted, so wait for it rather than for
// the dialog.
export async function dismissReleaseNotes(page: Page): Promise<void> {
  await expect
    .poll(() => readShowReleaseNotes(page), {
      message: 'the update turned the release notes on',
      timeout: 15_000,
    })
    .toBe(true)
  await page.getByRole('button', { name: /^(OK|知道了)$/ }).click()
  await expect
    .poll(() => readShowReleaseNotes(page), {
      message: 'dismissing the release notes turned them off',
    })
    .toBe(false)
}

async function readShowReleaseNotes(page: Page): Promise<boolean | undefined> {
  return page.evaluate(async () => {
    const stored = await chrome.storage.sync.get('extensionOptions')
    const options = stored.extensionOptions as
      | { data?: { showReleaseNotes?: boolean } }
      | undefined
    return options?.data?.showReleaseNotes
  })
}

export async function readIdbRows<T>(page: Page, table: string): Promise<T[]> {
  return page.evaluate(
    ([dbName, tableName]) =>
      new Promise<T[]>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction([tableName], 'readonly')
            const getAll = tx.objectStore(tableName).getAll()
            tx.oncomplete = () => {
              db.close()
              resolve(getAll.result as T[])
            }
            tx.onerror = () => reject(tx.error)
          } catch (e) {
            db.close()
            reject(e)
          }
        }
      }),
    [DANMAKU_DB_NAME, table] as const
  )
}
