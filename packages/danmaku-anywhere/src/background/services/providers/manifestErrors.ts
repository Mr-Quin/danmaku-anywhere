export type ManifestPipeline =
  | 'search'
  | 'season'
  | 'episodes'
  | 'parseUrl'
  | 'danmaku'
  | 'loginProbe'

export interface ManifestOutputSource {
  manifestId: string
  // Absent for an unsaved manifest run from the editor.
  providerConfigId?: string
  pipeline: ManifestPipeline
}

export type ManifestOutputFailure = 'not-array' | 'no-valid-rows' | 'invalid'

export class ManifestOutputError extends Error {
  readonly manifestId: string
  readonly providerConfigId: string | undefined
  readonly pipeline: ManifestPipeline

  constructor(
    source: ManifestOutputSource,
    readonly reason: ManifestOutputFailure,
    detail: string
  ) {
    super(`Manifest ${source.manifestId} ${source.pipeline} output ${detail}`)
    this.name = 'ManifestOutputError'
    this.manifestId = source.manifestId
    this.providerConfigId = source.providerConfigId
    this.pipeline = source.pipeline
  }
}
