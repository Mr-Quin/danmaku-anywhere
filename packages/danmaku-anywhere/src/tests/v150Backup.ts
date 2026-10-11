import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { fakeBrowser } from '@webext-core/fake-browser'

export interface V150Store<T> {
  data: T
  version: number
}

interface V150Backup {
  services: Record<string, V150Store<unknown>>
}

const FIXTURE_PATH = resolve(
  __dirname,
  '../../e2e/fixtures/migration/backup.json.gz'
)

export function readV150Backup(): unknown {
  return JSON.parse(gunzipSync(readFileSync(FIXTURE_PATH)).toString('utf-8'))
}

export function readV150Store<T>(name: string): V150Store<T> {
  const backup = readV150Backup() as V150Backup
  return backup.services[name] as V150Store<T>
}

// integrationPolicy is the one store that does not live in sync storage under
// its own name.
const STORAGE_LOCATION: Record<
  string,
  { key: string; area: 'sync' | 'local' }
> = { integrationPolicy: { key: 'xpathPolicy', area: 'local' } }

export function locateStore(name: string) {
  return STORAGE_LOCATION[name] ?? { key: name, area: 'sync' as const }
}

export async function seedV150Store(name: string) {
  const { key, area } = locateStore(name)
  await fakeBrowser.storage[area].set({ [key]: readV150Store(name) })
}

export async function readStoredV150Store(name: string) {
  const { key, area } = locateStore(name)
  const stored = await fakeBrowser.storage[area].get(key)
  return stored[key] as V150Store<unknown> | undefined
}
