import { computeNamespaceKey } from '@/common/providers/namespaceKey'
import type { DanmakuAnywhereDb } from './db'

type ReconcilableConfig = {
  id: string
  manifestId: string
  configValues?: Record<string, unknown>
  // The manifest's identityFields declaration, resolved by the caller.
  identityFields: readonly string[]
}

/**
 * Heal what the v15 migration left orphaned. The migration keeps the old
 * providerConfigId on season rows (and seasonMap keys) it couldn't resolve;
 * here, at runtime, config storage is safe to read, so we match each
 * unresolved row to a live config and stamp its manifestId + namespaceKey,
 * dropping providerConfigId, and rekey seasonMap entries the same way.
 *
 * Idempotent: a healed row has no providerConfigId; an unmatched row keeps it
 * for the next run (the caller schedules one per browser session). Returns the
 * number of season rows healed.
 */
export async function reconcileSeasonIdentity(
  db: DanmakuAnywhereDb,
  configs: ReconcilableConfig[]
): Promise<number> {
  const configById = new Map(configs.map((config) => [config.id, config]))
  let healed = 0

  const identityKey = (
    manifestId: string,
    namespaceKey: string,
    indexedId: string
  ): string => {
    return `${manifestId}\u0000${namespaceKey}\u0000${indexedId}`
  }

  await db.transaction('rw', db.season, db.seasonMap, async () => {
    const rows = await db.season.toArray()
    // Identities already held by a resolved row: healing must not converge an
    // orphan onto one (the v15 index is non-unique, so put() would duplicate).
    const claimed = new Set<string>()
    for (const r of rows) {
      if (r.manifestId != null && r.namespaceKey != null) {
        claimed.add(identityKey(r.manifestId, r.namespaceKey, r.indexedId))
      }
    }
    for (const season of rows) {
      const row = season as typeof season & { providerConfigId?: unknown }
      if (row.manifestId != null || typeof row.providerConfigId !== 'string') {
        continue
      }
      const config = configById.get(row.providerConfigId)
      if (!config) {
        continue
      }
      const namespaceKey = computeNamespaceKey(config, config.identityFields)
      const key = identityKey(config.manifestId, namespaceKey, row.indexedId)
      if (claimed.has(key)) {
        continue
      }
      row.manifestId = config.manifestId
      row.namespaceKey = namespaceKey
      delete row.providerConfigId
      await db.season.put(row)
      claimed.add(key)
      healed += 1
    }

    await db.seasonMap.toCollection().modify((entry) => {
      if (
        !entry.seasons ||
        typeof entry.seasons !== 'object' ||
        Array.isArray(entry.seasons)
      ) {
        return
      }
      let changed = false
      for (const [key, seasonId] of Object.entries(entry.seasons)) {
        const config = configById.get(key)
        if (!config) {
          continue
        }
        const namespaceKey = computeNamespaceKey(config, config.identityFields)
        delete entry.seasons[key]
        // A mapping already keyed by the namespace is newer intent; keep it.
        if (!(namespaceKey in entry.seasons)) {
          entry.seasons[namespaceKey] = seasonId
        }
        changed = true
      }
      if (changed) {
        entry.seasonIds = Array.from(new Set(Object.values(entry.seasons)))
      }
    })
  })

  return healed
}
