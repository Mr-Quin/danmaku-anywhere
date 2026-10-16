import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, vi } from 'vitest'

// fake-browser materializes every unimplemented API as a throwing stub, but an
// MV3 service worker genuinely has no getBackgroundPage. Code feature-detects on
// that to tell background from page contexts, so the property has to be absent.
delete (fakeBrowser.runtime as { getBackgroundPage?: unknown })
  .getBackgroundPage

// validateOrigin treats a thrown error as "malformed match pattern" and returns
// the message, so the unimplemented stub would fail every mount config pattern.
// The extension holds the permissions API, so answering true is what it sees.
fakeBrowser.permissions.contains = async () => true

// jsdom has no Web Locks. A test never has two upgrade services competing
// for the lock, so granting each request straight away is enough.
if (!('locks' in navigator)) {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name: string, callback: () => unknown) => {
        return Promise.resolve().then(callback)
      },
    },
  })
}

// unstubGlobals drops the stub after every test, so it has to be reapplied.
vi.stubGlobal('chrome', fakeBrowser)

beforeEach(() => {
  vi.stubGlobal('chrome', fakeBrowser)
  fakeBrowser.reset()
})
