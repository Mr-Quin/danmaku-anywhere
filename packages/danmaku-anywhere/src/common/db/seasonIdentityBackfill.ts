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
 * Recover a season's durable identity (manifestId === namespaceKey) from the
 * season row alone. A built-in providerConfigId is structurally the manifest id;
 * a custom one keys off a baseUrl that lives in config storage, not on the row,
 * so it cannot be recovered and the season orphans.
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
