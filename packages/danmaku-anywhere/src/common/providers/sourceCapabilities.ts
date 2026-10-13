export interface SourceCapabilities {
  search: boolean
  episodes: boolean
  danmaku: boolean
  seasonRefresh: boolean
  parseUrl: boolean
}

export type SourceCapability = keyof SourceCapabilities

// The reason is open text so the registry can say why it skipped a manifest.
export const MANIFEST_MISSING = 'missing'

export type SourceStatus =
  | { status: 'available'; capabilities: SourceCapabilities }
  | { status: 'unavailable'; reason: string }

export type SourceCapabilityAnswer = SourceStatus | { status: 'removed' }

export type UrlParseAnswer =
  | { kind: 'parseable'; sourceName: string }
  | { kind: 'unclaimed' }
  | { kind: 'notLink' }

interface ManifestPipelines {
  search?: unknown
  episodes?: unknown
  danmaku?: unknown
  season?: unknown
  parseUrl?: unknown
}

export const NO_CAPABILITIES: SourceCapabilities = {
  search: false,
  episodes: false,
  danmaku: false,
  seasonRefresh: false,
  parseUrl: false,
}

export const LEGACY_MACCMS_CAPABILITIES: SourceCapabilities = {
  ...NO_CAPABILITIES,
  search: true,
}

export function capabilitiesFromManifest(
  manifest: ManifestPipelines
): SourceCapabilities {
  return {
    search: manifest.search !== undefined,
    episodes: manifest.episodes !== undefined,
    danmaku: manifest.danmaku !== undefined,
    seasonRefresh: manifest.season !== undefined,
    parseUrl: manifest.parseUrl !== undefined,
  }
}

export function capabilitiesOf(
  answer: SourceCapabilityAnswer | undefined
): SourceCapabilities {
  if (answer?.status !== 'available') {
    return NO_CAPABILITIES
  }
  return answer.capabilities
}

// For lists that should not flicker while answers load, such as the search
// chips: a pending answer counts as capable. Menus instead hide an action
// until its answer arrives (seasonActions), and anything that would run the
// operation waits for the answer or lets the background refuse.
export function mayOffer(
  answer: SourceCapabilityAnswer | undefined,
  capability: SourceCapability
): boolean {
  return answer === undefined || capabilitiesOf(answer)[capability]
}

export function canMatchBySearch(capabilities: SourceCapabilities): boolean {
  return capabilities.search && canResolveMapping(capabilities)
}

export function canResolveMapping(capabilities: SourceCapabilities): boolean {
  return capabilities.episodes && capabilities.danmaku
}
