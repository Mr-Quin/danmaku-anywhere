export interface SourceCapabilities {
  search: boolean
  episodes: boolean
  danmaku: boolean
  seasonRefresh: boolean
  parseUrl: boolean
  automaticMatch: boolean
}

export interface SourceCapabilityAnswer {
  sourceRemoved: boolean
  capabilities: SourceCapabilities
}

export interface UrlParseSource {
  sourceName: string
}

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
  automaticMatch: false,
}

export const LEGACY_MACCMS_CAPABILITIES: SourceCapabilities = {
  ...NO_CAPABILITIES,
  search: true,
}

export function capabilitiesFromManifest(
  manifest: ManifestPipelines
): SourceCapabilities {
  const search = manifest.search !== undefined
  const episodes = manifest.episodes !== undefined
  const danmaku = manifest.danmaku !== undefined
  return {
    search,
    episodes,
    danmaku,
    seasonRefresh: manifest.season !== undefined,
    parseUrl: manifest.parseUrl !== undefined,
    automaticMatch: search && episodes && danmaku,
  }
}
