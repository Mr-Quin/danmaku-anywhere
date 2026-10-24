import { describe, expect, it, vi } from 'vitest'
import { getStandaloneStorageArea } from './standaloneStorage'

/**
 * The standalone storage area reports a write made in another tab, which
 * reaches this tab only as a window storage event, to its change listeners.
 * Events for another area or outside the extension's prefix are ignored. A
 * set that runs out of localStorage quota part way through puts back what it
 * already wrote and tells no listener, the way chrome.storage applies a set
 * as a whole.
 */

function otherTabWrites(key: string, oldValue: unknown, newValue: unknown) {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key,
      oldValue: oldValue === undefined ? null : JSON.stringify(oldValue),
      newValue: newValue === undefined ? null : JSON.stringify(newValue),
      storageArea: localStorage,
    })
  )
}

describe('standalone storage area', () => {
  it('reports a write from another tab to its listeners', () => {
    const area = getStandaloneStorageArea('local')
    const seen: unknown[] = []
    const listener = (changes: unknown) => {
      seen.push(changes)
    }
    area.onChanged.addListener(listener)

    otherTabWrites(
      'danmaku-anywhere:storage:local:optionsUpgradeRun',
      undefined,
      {
        status: 'running',
      }
    )

    expect(seen).toEqual([
      {
        optionsUpgradeRun: {
          oldValue: undefined,
          newValue: { status: 'running' },
        },
      },
    ])
    area.onChanged.removeListener(listener)
  })

  it('ignores writes to another area or another prefix', () => {
    const area = getStandaloneStorageArea('local')
    const seen: unknown[] = []
    const listener = (changes: unknown) => {
      seen.push(changes)
    }
    area.onChanged.addListener(listener)

    otherTabWrites('danmaku-anywhere:storage:sync:extensionOptions', 1, 2)
    otherTabWrites('unrelated', 1, 2)

    expect(seen).toEqual([])
    area.onChanged.removeListener(listener)
  })

  it('puts back every key of a set that fails part way through', async () => {
    const area = getStandaloneStorageArea('sync')
    await area.set({ store: { version: 1 }, 'store.list.0': 'old' })
    const listener = vi.fn()
    area.onChanged.addListener(listener)
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key.endsWith('store.list.1')) {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      setItem.call(this, key, value)
    })

    await expect(
      area.set({
        store: { version: 2 },
        'store.list.0': 'new',
        'store.list.1': 'new',
      })
    ).rejects.toThrow('quota')

    vi.mocked(Storage.prototype.setItem).mockRestore()
    expect(await area.get(['store', 'store.list.0', 'store.list.1'])).toEqual({
      store: { version: 1 },
      'store.list.0': 'old',
      'store.list.1': undefined,
    })
    expect(listener).not.toHaveBeenCalled()
    area.onChanged.removeListener(listener)
  })
})
