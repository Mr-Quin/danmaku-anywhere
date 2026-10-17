import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import { LATEST_MOUNT_CONFIG_VERSION } from '@/common/options/mountConfig/version'
import { OPTION_STORES } from '@/common/options/optionStores'
import { MAIN_CONTENT_SCRIPT_ID, ScriptingManager } from './ScriptingManager'

vi.mock('@/content/controller?script', () => {
  return { default: 'assets/controller-current.js' }
})

/**
 * ScriptingManager brings the controller registration in line with the stored
 * mount configs whenever the worker starts, as it does after an update that
 * dropped the registration or left it on the previous build's script. Asserts
 * the registration chrome ends up with, and that a matching one is left alone.
 */

type RegisteredScript = chrome.scripting.RegisteredContentScript

function fakeScripting(initial: RegisteredScript[]) {
  const scripts = new Map(initial.map((script) => [script.id, script]))

  const scripting = {
    getRegisteredContentScripts: vi.fn(
      async (filter?: chrome.scripting.ContentScriptFilter) => {
        return [...scripts.values()].filter((script) => {
          return !filter?.ids || filter.ids.includes(script.id)
        })
      }
    ),
    registerContentScripts: vi.fn(async (list: RegisteredScript[]) => {
      for (const script of list) {
        scripts.set(script.id, script)
      }
    }),
    updateContentScripts: vi.fn(async (list: RegisteredScript[]) => {
      for (const script of list) {
        const existing = scripts.get(script.id)
        if (!existing) {
          throw new Error(`No script with id ${script.id}`)
        }
        scripts.set(script.id, { ...existing, ...script })
      }
    }),
    unregisterContentScripts: vi.fn(
      async (filter?: chrome.scripting.ContentScriptFilter) => {
        for (const id of filter?.ids ?? [...scripts.keys()]) {
          scripts.delete(id)
        }
      }
    ),
  }
  Object.assign(fakeBrowser.scripting, scripting)

  return { scripting, scripts }
}

// Every store is seeded at its latest version, so readiness lets the mount
// config read through without an upgrade run.
async function seedMountConfigs(
  configs: { patterns: string[]; enabled: boolean }[]
) {
  for (const store of OPTION_STORES) {
    await fakeBrowser.storage[store.area].set({
      [store.key]: { data: {}, version: store.latestVersion },
    })
  }
  await fakeBrowser.storage.sync.set({
    mountConfig: {
      data: configs.map((config, i) => {
        return { ...createMountConfig(config), id: `config-${i}` }
      }),
      version: LATEST_MOUNT_CONFIG_VERSION,
    },
  })
}

function startWorker() {
  createBackgroundContainer().get(ScriptingManager).setup()
}

describe('ScriptingManager', () => {
  it('registers the controller when the worker starts without a registration', async () => {
    await seedMountConfigs([
      { patterns: ['https://a.example.com/*'], enabled: true },
      { patterns: ['https://off.example.com/*'], enabled: false },
    ])
    const { scripts } = fakeScripting([])

    startWorker()

    await vi.waitFor(() => {
      expect(scripts.get(MAIN_CONTENT_SCRIPT_ID)).toMatchObject({
        js: ['assets/controller-current.js'],
        matches: ['https://a.example.com/*'],
        persistAcrossSessions: true,
      })
    })
  })

  it("moves a registration left by the previous build onto this build's script", async () => {
    await seedMountConfigs([
      { patterns: ['https://a.example.com/*'], enabled: true },
      { patterns: ['https://b.example.com/*'], enabled: true },
    ])
    const { scripts } = fakeScripting([
      {
        id: MAIN_CONTENT_SCRIPT_ID,
        js: ['assets/controller-previous.js'],
        matches: ['https://a.example.com/*'],
        persistAcrossSessions: true,
      },
    ])

    startWorker()

    await vi.waitFor(() => {
      expect(scripts.get(MAIN_CONTENT_SCRIPT_ID)).toMatchObject({
        js: ['assets/controller-current.js'],
        matches: ['https://a.example.com/*', 'https://b.example.com/*'],
      })
    })
  })

  it('unregisters the controller when no mount config is enabled', async () => {
    await seedMountConfigs([
      { patterns: ['https://a.example.com/*'], enabled: false },
    ])
    const { scripts } = fakeScripting([
      {
        id: MAIN_CONTENT_SCRIPT_ID,
        js: ['assets/controller-previous.js'],
        matches: ['https://a.example.com/*'],
      },
    ])

    startWorker()

    await vi.waitFor(() => {
      expect(scripts.has(MAIN_CONTENT_SCRIPT_ID)).toBe(false)
    })
  })

  it('leaves a registration that already matches untouched', async () => {
    await seedMountConfigs([
      { patterns: ['https://a.example.com/*'], enabled: true },
    ])
    const { scripting } = fakeScripting([
      {
        id: MAIN_CONTENT_SCRIPT_ID,
        js: ['assets/controller-current.js'],
        matches: ['https://a.example.com/*'],
      },
    ])

    startWorker()

    await vi.waitFor(() => {
      expect(scripting.getRegisteredContentScripts).toHaveBeenCalled()
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scripting.registerContentScripts).not.toHaveBeenCalled()
    expect(scripting.updateContentScripts).not.toHaveBeenCalled()
  })
})
