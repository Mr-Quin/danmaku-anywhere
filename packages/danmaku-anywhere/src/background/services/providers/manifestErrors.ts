import type { ManifestUnavailableReason } from '@/common/rpcClient/background/types'

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

export type ManifestOutputFailure =
  | 'not-array'
  | 'no-valid-rows'
  | 'invalid-output'

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

export type ManifestLookupFailure = 'not-registered' | ManifestUnavailableReason

function describeLookupFailure(
  manifestId: string,
  reason: ManifestLookupFailure
): string {
  switch (reason) {
    case 'not-registered':
      return `no manifest registered with id: ${manifestId}`
    case 'needs-newer-extension':
      return `Manifest ${manifestId} needs a newer version of the extension`
    case 'invalid-manifest':
      return `Manifest ${manifestId} is stored but cannot be loaded`
  }
}

export class ManifestUnavailableError extends Error {
  constructor(
    readonly manifestId: string,
    readonly reason: ManifestLookupFailure
  ) {
    super(describeLookupFailure(manifestId, reason))
    this.name = 'ManifestUnavailableError'
  }
}

// A manifest offered for saving or a test run that this build will not take.
export class ManifestValidationError extends Error {
  constructor(
    readonly reason: ManifestUnavailableReason,
    message: string
  ) {
    super(message)
    this.name = 'ManifestValidationError'
  }
}
