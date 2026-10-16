import 'fake-indexeddb/auto'
import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { makeProviderConfig } from '@/tests/factories'
import {
  type LockRequest,
  lockedProviderConfigWriter,
} from './lockedProviderConfigWriter'

/**
 * Two standalone tabs each have their own writer and write queue over the
 * same storage. With every write holding the shared lock, a toggle in one tab
 * and a delete in the other both land even when their reads would interleave.
 */

const builtinDdp = makeProviderConfig({
  id: 'dandanplay',
  manifestId: 'dandanplay',
  configValues: { chConvert: 0 },
})

const selfHosted = makeProviderConfig({
  id: 'self-hosted',
  manifestId: 'dandanplay',
  customName: 'Home server',
  configValues: { baseUrl: 'https://ddp.home.example' },
})

// Runs callbacks one at a time in request order, like navigator.locks for a
// single lock name.
function serialLock() {
  const names: string[] = []
  let tail: Promise<unknown> = Promise.resolve()
  const request: LockRequest = (name, run) => {
    names.push(name)
    const result = tail.then(run)
    tail = result.catch(() => undefined)
    return result
  }
  return { names, request }
}

// The first read waits until a second read starts, or for a while if none
// does, so two writes that are not serialized both read before either writes.
function pairReads() {
  const read = ExtStorageService.prototype.read
  const second = Promise.withResolvers<void>()
  let reads = 0
  vi.spyOn(ExtStorageService.prototype, 'read').mockImplementation(
    async function (this: ExtStorageService<unknown>) {
      reads += 1
      if (reads === 1) {
        await Promise.race([
          second.promise,
          new Promise((resolve) => setTimeout(resolve, 200)),
        ])
      } else {
        second.resolve()
      }
      return read.call(this)
    }
  )
}

function tab(lock: LockRequest) {
  const container = createUpgradeContainer()
  return {
    writes: lockedProviderConfigWriter(
      container.get(ProviderConfigWriter),
      lock
    ),
    readAll: () => container.get(ProviderConfigService).getAll(),
  }
}

describe('lockedProviderConfigWriter', () => {
  it('keeps writes from two tabs from overwriting each other', async () => {
    const data: ProviderConfig[] = [builtinDdp, selfHosted]
    await fakeBrowser.storage.sync.set({
      providerConfig: { version: 6, data },
    })
    const lock = serialLock()
    const first = tab(lock.request)
    const second = tab(lock.request)
    pairReads()

    await Promise.all([
      first.writes.setEnabled('dandanplay', false),
      second.writes.delete('self-hosted'),
    ])

    expect(await first.readAll()).toEqual([{ ...builtinDdp, enabled: false }])
    expect(lock.names).toEqual(['provider-config', 'provider-config'])
  })
})
