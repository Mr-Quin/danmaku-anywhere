// @ts-nocheck

import { vi } from 'vitest'

export const mockStorage = {
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
