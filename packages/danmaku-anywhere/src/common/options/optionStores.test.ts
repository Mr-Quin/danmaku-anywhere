import { describe, expect, it } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { type IStoreService, StoreServiceSymbol } from './IStoreService'
import { OPTION_STORES } from './optionStores'

/**
 * Readiness reads the store descriptors, never the store services, so each
 * descriptor has to match the service it describes: same key, and a latest
 * version equal to the last upgrade step the service registers. The list
 * covers every bound store in upgrade order.
 */

describe('option store descriptors', () => {
  const stores =
    createUpgradeContainer().getAll<IStoreService>(StoreServiceSymbol)

  it('lists every bound store in the order they are upgraded', () => {
    expect(stores.map((store) => store.descriptor)).toEqual(OPTION_STORES)
  })

  it.each(
    stores.map((store) => [store.name, store] as const)
  )('match the %s service', (_, store) => {
    expect(store.options.key).toBe(store.descriptor.key)
    expect(store.options.latestVersion).toBe(store.descriptor.latestVersion)
  })
})
