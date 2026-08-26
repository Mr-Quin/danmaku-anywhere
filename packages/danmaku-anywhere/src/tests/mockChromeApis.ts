import { beforeEach, vi } from 'vitest'
import { fakeChrome, resetFakeChrome } from './fakes/fakeChrome'

export const mockChrome = fakeChrome

vi.stubGlobal('chrome', mockChrome)

beforeEach(() => {
  vi.stubGlobal('chrome', mockChrome)
  resetFakeChrome()
})
