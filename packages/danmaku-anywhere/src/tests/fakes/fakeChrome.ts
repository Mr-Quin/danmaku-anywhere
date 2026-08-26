import { type Mock, vi } from 'vitest'
import {
  createFakeChromeStorage,
  type FakeChromeStorage,
  type StorageItems,
  type StorageKeys,
} from './fakeChromeStorage'

type StorageGet = {
  (keys?: StorageKeys): Promise<StorageItems>
  (keys: StorageKeys, callback: (items: StorageItems) => void): void
}

type StorageSet = (items: StorageItems) => Promise<void>
type StorageRemove = (keys: string | string[]) => Promise<void>
type StorageClear = () => Promise<void>
type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>
) => void
type AlarmListener = (alarm: chrome.alarms.Alarm) => void | Promise<void>

interface FakeStorageArea {
  get: Mock<StorageGet>
  set: Mock<StorageSet>
  remove: Mock<StorageRemove>
  clear: Mock<StorageClear>
  onChanged: {
    addListener: Mock<(listener: StorageChangeListener) => void>
    removeListener: Mock<(listener: StorageChangeListener) => void>
    hasListener: Mock<(listener: StorageChangeListener) => boolean>
  }
}

interface FakeRuntime {
  id: string
  getManifest: Mock<() => chrome.runtime.ManifestV3>
  getURL: Mock<(path?: string) => string>
  onInstalled: {
    addListener: Mock<
      (listener: (details: chrome.runtime.InstalledDetails) => void) => void
    >
  }
}

interface FakeAlarms {
  get: Mock<(name: string) => Promise<chrome.alarms.Alarm | undefined>>
  create: Mock<
    (name: string, alarmInfo?: chrome.alarms.AlarmCreateInfo) => Promise<void>
  >
  clear: Mock<(name?: string) => Promise<void>>
  onAlarm: {
    addListener: Mock<(listener: AlarmListener) => void>
    removeListener: Mock<(listener: AlarmListener) => void>
    hasListener: Mock<(listener: AlarmListener) => boolean>
  }
}

export interface FakeChrome {
  storage: {
    local: FakeStorageArea
    sync: FakeStorageArea
    session: FakeStorageArea
  }
  runtime: FakeRuntime
  alarms: FakeAlarms
}

function createFakeStorageArea(
  storage: FakeChromeStorage['local']
): FakeStorageArea {
  return {
    get: vi.fn(storage.get),
    set: vi.fn(storage.set),
    remove: vi.fn(storage.remove),
    clear: vi.fn(storage.clear),
    onChanged: {
      addListener: vi.fn(storage.onChanged.addListener),
      removeListener: vi.fn(storage.onChanged.removeListener),
      hasListener: vi.fn(storage.onChanged.hasListener),
    },
  }
}

function createFakeChrome(): {
  chrome: FakeChrome
  reset: () => void
} {
  const storage = createFakeChromeStorage()
  const installedListeners = new Set<
    (details: chrome.runtime.InstalledDetails) => void
  >()
  const alarmListeners = new Set<AlarmListener>()

  const chrome: FakeChrome = {
    storage: {
      local: createFakeStorageArea(storage.local),
      sync: createFakeStorageArea(storage.sync),
      session: createFakeStorageArea(storage.session),
    },
    runtime: {
      id: 'test',
      getManifest: vi.fn(() => ({
        manifest_version: 3,
        name: 'Test extension',
        version: '0.0.0',
      })),
      getURL: vi.fn((path = '') => `chrome-extension://test/${path}`),
      onInstalled: {
        addListener: vi.fn((listener) => {
          installedListeners.add(listener)
        }),
      },
    },
    alarms: {
      get: vi.fn(async () => undefined),
      create: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined),
      onAlarm: {
        addListener: vi.fn((listener) => {
          alarmListeners.add(listener)
        }),
        removeListener: vi.fn((listener) => {
          alarmListeners.delete(listener)
        }),
        hasListener: vi.fn((listener) => alarmListeners.has(listener)),
      },
    },
  }

  function reset() {
    storage.reset()
    installedListeners.clear()
    alarmListeners.clear()
    vi.clearAllMocks()
  }

  return { chrome, reset }
}

const fakeChromeState = createFakeChrome()

export const fakeChrome = fakeChromeState.chrome

export function resetFakeChrome() {
  fakeChromeState.reset()
}
