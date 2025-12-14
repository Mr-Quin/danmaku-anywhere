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

interface MockChrome {
  storage: {
    local: MockStorage
    sync: MockStorage
    session: MockStorage
  }
  runtime: {
    getManifest: Mock
  }
}

const mockStorage: MockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}

export const mockChrome: MockChrome = {
  storage: {
    local: mockStorage,
    sync: mockStorage,
    session: mockStorage,
  },
  runtime: {
    getManifest: vi.fn(),
  },
} as const

global.chrome = mockChrome
