import {
  AppError,
  type ManifestPipeline,
  type ManifestRejection,
  type SourceRef,
  type SourceUnavailableReason,
} from '@/common/errors/AppError'

export interface ManifestOutputSource {
  manifestId: string
  pipeline: ManifestPipeline
  // Absent for an unsaved manifest run from the editor.
  source?: SourceRef
}

function describeLookupFailure(
  manifestId: string,
  reason: SourceUnavailableReason
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

export function manifestUnavailable(
  manifestId: string,
  reason: SourceUnavailableReason
): AppError<'manifest.unavailable'> {
  return new AppError(
    'manifest.unavailable',
    { manifestId, reason },
    { message: describeLookupFailure(manifestId, reason) }
  )
}

// A manifest offered for saving or a test run that this build will not take.
export function manifestRejected(
  reason: ManifestRejection,
  message: string,
  detail?: string
): AppError<'manifest.rejected'> {
  return new AppError('manifest.rejected', { reason, detail }, { message })
}
