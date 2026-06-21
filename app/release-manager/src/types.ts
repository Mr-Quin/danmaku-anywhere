export type Channel = 'stable' | 'preview'

export type PreviewSubtype = 'nightly' | 'pr' | 'branch' | 'manual' | 'generic'

export interface ReleaseAsset {
  tag: string
  version: string
  channel: Channel
  previewSubtype?: PreviewSubtype
  publishedAt: string
  assetUrl: string
}

export interface CachedBuild {
  tag: string
  version: string
  channel: Channel
  downloadedAt: string
}

export interface PublicState {
  activeTag?: string
  activePath?: string
  dataDir: string
  builds: CachedBuild[]
}

export interface Row {
  tag: string
  version: string
  channel: Channel
  previewSubtype?: PreviewSubtype
  publishedAt?: string
}
