type NoParams = Record<never, never>

export interface SourceRef {
  providerConfigId: string
  manifestId: string
  name: string
}

export interface AppErrorParams {
  network: { source?: SourceRef }
  http: { status: number; source?: SourceRef }
  timeout: { source?: SourceRef }
  aborted: NoParams
  hostNotAllowed: { source?: SourceRef }
  'rpc.unreachable': NoParams
  'source.removed': NoParams
  'source.noUrlParser': NoParams
  'source.urlEpisodeNotFound': NoParams
  'source.episodesUnsupported': { source: SourceRef }
  'source.refetchUnsupported': { source: SourceRef }
  'source.noDanmaku': { title: string }
  'match.notFound': { title: string }
  'source.badResponse': { source?: SourceRef }
  'catalog.unreachable': NoParams
  'catalog.empty': NoParams
  'catalog.applyFailed': { manifestIds: string[] }
  'backup.notJson': NoParams
  'backup.invalidFormat': NoParams
  'backup.unsupportedVersion': NoParams
  'mount.noActiveFrame': NoParams
  'mount.failed': NoParams
  'shareCode.invalid': NoParams
  'importUrl.invalidUrl': NoParams
  'importUrl.invalidScheme': NoParams
  'importUrl.unsupportedExtension': NoParams
  'importUrl.tooLarge': { limit: string }
  unknown: NoParams
}

export type AppErrorCode = keyof AppErrorParams

const CODES: Record<AppErrorCode, true> = {
  network: true,
  http: true,
  timeout: true,
  aborted: true,
  hostNotAllowed: true,
  'rpc.unreachable': true,
  'source.removed': true,
  'source.noUrlParser': true,
  'source.urlEpisodeNotFound': true,
  'source.episodesUnsupported': true,
  'source.refetchUnsupported': true,
  'source.noDanmaku': true,
  'match.notFound': true,
  'source.badResponse': true,
  'catalog.unreachable': true,
  'catalog.empty': true,
  'catalog.applyFailed': true,
  'backup.notJson': true,
  'backup.invalidFormat': true,
  'backup.unsupportedVersion': true,
  'mount.noActiveFrame': true,
  'mount.failed': true,
  'shareCode.invalid': true,
  'importUrl.invalidUrl': true,
  'importUrl.invalidScheme': true,
  'importUrl.unsupportedExtension': true,
  'importUrl.tooLarge': true,
  unknown: true,
}

export const APP_ERROR_CODES = Object.keys(CODES) as AppErrorCode[]

export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && Object.hasOwn(CODES, value)
}

interface AppErrorOptions {
  message?: string
  cause?: unknown
}

type AppErrorArgs<C extends AppErrorCode> =
  keyof AppErrorParams[C] extends never
    ? [params?: AppErrorParams[C], options?: AppErrorOptions]
    : [params: AppErrorParams[C], options?: AppErrorOptions]

function defaultMessage(code: AppErrorCode, cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    return `${code}: ${cause.message}`
  }
  return code
}

// The message is for logs only. User-facing text comes from describeError.
export class AppError<C extends AppErrorCode = AppErrorCode> extends Error {
  readonly code: C
  readonly params: AppErrorParams[C]

  constructor(code: C, ...[params, options]: AppErrorArgs<C>) {
    super(options?.message ?? defaultMessage(code, options?.cause), {
      cause: options?.cause,
    })
    this.name = 'AppError'
    this.code = code
    this.params = params ?? ({} as AppErrorParams[C])
  }

  is<K extends AppErrorCode>(code: K): this is AppError<K> {
    return (this.code as AppErrorCode) === code
  }
}
