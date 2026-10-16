import { describe, expect, it } from 'vitest'
import { getStandaloneStorageArea } from './standaloneStorage'

/**
 * The standalone storage area reports a write made in another tab, which
 * reaches this tab only as a window storage event, to its change listeners.
 * Events for another area or outside the extension's prefix are ignored.
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
})
