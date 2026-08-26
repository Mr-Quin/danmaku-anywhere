import { beforeEach, vi } from 'vitest'
import { fakeChrome, resetFakeChrome } from './fakes/fakeChrome'

export const mockChrome = fakeChrome

vi.stubGlobal('chrome', mockChrome)

beforeEach(() => {
  resetFakeChrome()
})
