import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { bootstrapUiLanguage, createUiContainer } from '@/common/ioc/uiIoc'
import { i18n } from '@/common/localization/i18n'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { OPTION_STORES } from '@/common/options/optionStores'

/**
 * The player script runs in every frame of every page. With every option
 * store already upgraded, its start (the UI language bootstrap and a first
 * options read) reads storage four times: the stored language, one read per
 * storage area to check readiness, and the options themselves. Once ready,
 * readiness leaves no storage listener behind.
 */

async function seedCurrentStores() {
  for (const store of OPTION_STORES) {
    await fakeBrowser.storage[store.area].set({
      [store.key]: { data: {}, version: store.latestVersion },
    })
  }
}

function countListeners() {
  let active = 0
  for (const area of ['sync', 'local'] as const) {
    const event = fakeBrowser.storage[area].onChanged
    const add = event.addListener.bind(event)
    const remove = event.removeListener.bind(event)
    vi.spyOn(event, 'addListener').mockImplementation((listener) => {
      active += 1
      add(listener)
    })
    vi.spyOn(event, 'removeListener').mockImplementation((listener) => {
      active -= 1
      remove(listener)
    })
  }
  return () => active
}

describe('a player frame at page load', () => {
  it('reads storage four times and keeps no readiness listener', async () => {
    await seedCurrentStores()
    Object.assign(i18n, { changeLanguage: vi.fn() })
    const syncGet = vi.spyOn(fakeBrowser.storage.sync, 'get')
    const localGet = vi.spyOn(fakeBrowser.storage.local, 'get')
    const activeListeners = countListeners()
    const container = createUiContainer()

    bootstrapUiLanguage(container)
    const danmakuOptions = container.get(DanmakuOptionsService)
    const storeListeners = activeListeners()
    await danmakuOptions.get()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(syncGet.mock.calls.length + localGet.mock.calls.length).toBe(4)
    expect(activeListeners()).toBe(storeListeners)
  })
})
