// @ts-nocheck

import { type Mock, vi } from 'vitest'

type MockStorage = {
  get: Mock
  set: Mock
  remove: Mock
  clear: Mock
  onChanged: {
    addListener: Mock
    removeListener: Mock
  }
}

export const mockStorage: MockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}

global.chrome = {
  storage: {
    local: mockStorage,
    sync: mockStorage,
    session: mockStorage,
  },
}
