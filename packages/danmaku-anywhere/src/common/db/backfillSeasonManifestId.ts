import {
  PROVIDER_TO_BUILTIN_ID,
  stripBuiltinPrefix,
} from '@danmaku-anywhere/danmaku-converter'

const BUILTIN_CONFIG_IDS = new Set<string>(
  Object.values(PROVIDER_TO_BUILTIN_ID)
)

/**
 * Derive a season's manifestId during the v15 backfill.
 *
 * 1. The season's providerConfigId matches a live config: that config's
 *    manifestId is the source of truth.
 * 2. Otherwise the providerConfigId is itself a builtin id (seeded builtins use
 *    id === manifestId), so it IS the manifestId. This is structural and does
 *    not depend on config storage, so it also heals pre-existing builtin
 *    orphans.
 * 3. Otherwise leave it unset: an unrecoverable uuid orphan.
 *
 * Never derive from the season.provider enum. Catalog sources carry the neutral
 * DanDanPlay tag, so that would mis-stamp an orphaned catalog season with
 * manifestId 'dandanplay' and reparent it onto the wrong source.
 */
export function resolveSeasonManifestId(
  providerConfigId: string,
  manifestIdByConfigId: Map<string, string>
): string | undefined {
  const liveManifestId = manifestIdByConfigId.get(providerConfigId)
  if (liveManifestId !== undefined) {
    return liveManifestId
  }

  const bareId = stripBuiltinPrefix(providerConfigId)
  if (BUILTIN_CONFIG_IDS.has(bareId)) {
    return bareId
  }

  return undefined
}
