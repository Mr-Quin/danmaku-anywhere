import type { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'

export type LockRequest = <T>(name: string, run: () => Promise<T>) => Promise<T>

export type ProviderConfigWrites = Pick<
  ProviderConfigWriter,
  'create' | 'addBuiltin' | 'update' | 'setEnabled' | 'setOrder' | 'delete'
>

const LOCK_NAME = 'provider-config'

// Every standalone tab has its own writer and write queue over the same
// localStorage, so each write also holds a lock all the tabs share.
export function lockedProviderConfigWriter(
  writer: ProviderConfigWriter,
  lock: LockRequest
): ProviderConfigWrites {
  return {
    create: (draft) => lock(LOCK_NAME, () => writer.create(draft)),
    addBuiltin: (manifestId) => {
      return lock(LOCK_NAME, () => writer.addBuiltin(manifestId))
    },
    update: (id, edit) => lock(LOCK_NAME, () => writer.update(id, edit)),
    setEnabled: (id, enabled) => {
      return lock(LOCK_NAME, () => writer.setEnabled(id, enabled))
    },
    setOrder: (ids) => lock(LOCK_NAME, () => writer.setOrder(ids)),
    delete: (id) => lock(LOCK_NAME, () => writer.delete(id)),
  }
}
