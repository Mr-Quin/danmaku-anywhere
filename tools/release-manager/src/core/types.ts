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

export interface Config {
  githubToken?: string
  activeTag?: string
  builds: CachedBuild[]
}

export interface PublicState {
  hasToken: boolean
  activeTag?: string
  activePath?: string
  dataDir: string
  builds: CachedBuild[]
}

export type ReleaseManagerError =
  | { kind: 'auth'; status: number; message: string }
  | { kind: 'rate-limited'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'swap'; message: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'invalid'; message: string }
