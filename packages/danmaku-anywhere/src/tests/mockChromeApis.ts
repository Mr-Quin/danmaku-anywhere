// @ts-nocheck
import { type Mock, vi } from 'vitest'

interface MockStorage {
  get: Mock
  set: Mock
  remove: Mock
  clear: Mock
  onChanged: {
    addListener: Mock
    removeListener: Mock
  }
}

interface MockAlarms {
  get: Mock
  create: Mock
  clear: Mock
  onAlarm: {
    addListener: Mock
    removeListener: Mock
    hasListener: Mock
  }
}

interface MockChrome {
  storage: {
    local: MockStorage
    sync: MockStorage
    session: MockStorage
  }
  runtime: {
    getManifest: Mock
    onInstalled: {
      addListener: Mock
    }
  }
  alarms: MockAlarms
}

const createMockStorage = (): MockStorage => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
})

export const mockChrome: MockChrome = {
  storage: {
    local: createMockStorage(),
    sync: createMockStorage(),
    session: createMockStorage(),
  },
  runtime: {
    getManifest: vi.fn(),
    getURL: vi.fn(),
    id: 'test',
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  alarms: {
    get: vi.fn(async () => undefined),
    create: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
  },
} as const

global.chrome = mockChrome
