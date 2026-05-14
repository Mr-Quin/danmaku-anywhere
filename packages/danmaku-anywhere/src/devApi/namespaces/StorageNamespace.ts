import { injectable } from 'inversify'
import {
  type AnyMethodDef,
  DevApiError,
  type DevNamespace,
  defineMethod,
} from '../registry'

export type StorageArea = 'sync' | 'local' | 'session'

const ALLOWED_AREAS: StorageArea[] = ['sync', 'local', 'session']

function getArea(area: StorageArea): chrome.storage.StorageArea {
  if (!ALLOWED_AREAS.includes(area)) {
    throw new DevApiError(`Unknown storage area: ${area}`)
  }
  const handle = chrome.storage[area]
  if (!handle) {
    throw new DevApiError(
      `chrome.storage.${area} is unavailable in this browser/runtime`
    )
  }
  return handle
}

export interface StorageApi {
  get(area: StorageArea, key: string): Promise<unknown>
  snapshot(area: StorageArea): Promise<Record<string, unknown>>
  setRaw(area: StorageArea, key: string, value: unknown): Promise<void>
  clear(): Promise<void>
}

@injectable('Singleton')
export class StorageNamespace implements DevNamespace {
  readonly name = 'storage'
  readonly description = 'Raw chrome.storage access (escape hatch for tests)'
  readonly methods: readonly AnyMethodDef[] = [
    defineMethod({
      name: 'get',
      description: 'Get a value from a storage area',
      kind: 'read',
      args: [
        { name: 'area', type: "'sync'|'local'|'session'" },
        { name: 'key', type: 'string' },
      ],
      handler: async (area: StorageArea, key: string) => {
        const data = await getArea(area).get(key)
        return data[key] ?? null
      },
    }),
    defineMethod({
      name: 'snapshot',
      description: 'Snapshot the full contents of a storage area',
      kind: 'read',
      args: [{ name: 'area', type: "'sync'|'local'|'session'" }],
      handler: (area: StorageArea) => getArea(area).get(null),
    }),
    defineMethod({
      name: 'setRaw',
      description:
        'Write a raw value to a storage area, bypassing the typed services',
      kind: 'write',
      args: [
        { name: 'area', type: "'sync'|'local'|'session'" },
        { name: 'key', type: 'string' },
        { name: 'value', type: 'JSON-clonable' },
      ],
      handler: (area: StorageArea, key: string, value: unknown) =>
        getArea(area).set({ [key]: value }),
    }),
    defineMethod({
      name: 'clear',
      description: 'Clear all storage areas',
      kind: 'write',
      handler: async () => {
        await Promise.all(
          ALLOWED_AREAS.filter((a) => chrome.storage[a]).map((a) =>
            chrome.storage[a].clear()
          )
        )
      },
    }),
  ]
}
