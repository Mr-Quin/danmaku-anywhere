import type {
  getManifest,
  getPolicy,
} from '@danmaku-anywhere/danmaku-provider/kazumi'

export type ManifestResult = Awaited<ReturnType<typeof getManifest>>
export type PolicyResult = Awaited<ReturnType<typeof getPolicy>>

// The kazumi rule catalog (manifest list + individual policy files). Real
// mode fetches these over HTTP from the danmaku-provider api; fake mode
// serves them in-memory so the search/watch flow runs without network.
export abstract class KazumiCatalog {
  abstract getManifest(): Promise<ManifestResult>
  abstract getPolicy(fileName: string): Promise<PolicyResult>
}
