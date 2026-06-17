import { resolveBuiltinManifestId } from '@danmaku-anywhere/danmaku-converter'

/**
 * The migration's view of resolveBuiltinManifestId: a built-in providerConfigId
 * is the season's durable identity (manifestId === namespaceKey); anything else
 * orphans.
 */
export function resolveBuiltinSeasonIdentity(
  providerConfigId: string | undefined | null
): string | undefined {
  return resolveBuiltinManifestId(providerConfigId)
}
