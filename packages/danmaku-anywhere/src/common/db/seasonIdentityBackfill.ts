import {
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
  stripBuiltinPrefix,
} from '@danmaku-anywhere/danmaku-converter'

// legacy:maccms appears in PROVIDER_TO_BUILTIN_ID for config migration mapping
// but is not a real manifest, so it is not a built-in season identity.
const BUILTIN_MANIFEST_IDS = new Set<string>(
  Object.values(PROVIDER_TO_BUILTIN_ID).filter((id) => id !== LEGACY_MACCMS_ID)
)

/**
 * Recover a season's durable identity (manifestId === namespaceKey) from its old
 * providerConfigId, using only the season row. Built-in sources heal: their
 * providerConfigId is structurally the manifest id. Custom self-hosted sources
 * cannot: their namespace derives from a server baseUrl that lives in provider
 * config storage, not on the row, so they are left orphaned (the row and its
 * danmaku survive; re-searching the source recreates the link).
 */
export function resolveBuiltinSeasonIdentity(
  providerConfigId: string | undefined | null
): string | undefined {
  if (typeof providerConfigId !== 'string') {
    return undefined
  }
  const bareId = stripBuiltinPrefix(providerConfigId)
  return BUILTIN_MANIFEST_IDS.has(bareId) ? bareId : undefined
}
