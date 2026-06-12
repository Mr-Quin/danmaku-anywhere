import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
  stripBuiltinPrefix,
} from '@danmaku-anywhere/danmaku-converter'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'

// legacy:maccms is in PROVIDER_TO_BUILTIN_ID for migration mapping but is not a
// real manifest, so it must not be treated as a structural manifestId.
const BUILTIN_CONFIG_IDS = new Set<string>(
  Object.values(PROVIDER_TO_BUILTIN_ID).filter((id) => id !== LEGACY_MACCMS_ID)
)

// The config fields the v15 backfill needs to recompute a namespaceKey, kept
// permissive so it can read raw pre-migration rows.
export interface BackfillProviderConfig {
  id: string
  manifestId: string
  configValues?: Record<string, unknown>
}

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
  providerConfigId: string | undefined | null,
  manifestIdByConfigId: Map<string, string>
): string | undefined {
  if (typeof providerConfigId !== 'string') {
    return undefined
  }

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

/**
 * Derive a season's namespaceKey during the v15 backfill, mirroring the
 * manifestId precedence:
 *
 * 1. The providerConfigId matches a live config: recompute the namespaceKey
 *    from that config (self-hosted instances hash their baseUrl).
 * 2. Otherwise the providerConfigId is a builtin id: builtins share one global
 *    namespace, so the namespaceKey is the bare builtin id (== its manifestId).
 * 3. Otherwise leave it unset: an unrecoverable orphan, same as manifestId.
 */
export function resolveSeasonNamespaceKey(
  providerConfigId: string | undefined | null,
  configByConfigId: Map<string, BackfillProviderConfig>
): string | undefined {
  if (typeof providerConfigId !== 'string') {
    return undefined
  }

  const liveConfig = configByConfigId.get(providerConfigId)
  if (liveConfig !== undefined) {
    return computeNamespaceKey(liveConfig)
  }

  const bareId = stripBuiltinPrefix(providerConfigId)
  if (BUILTIN_CONFIG_IDS.has(bareId)) {
    return bareId
  }

  return undefined
}
