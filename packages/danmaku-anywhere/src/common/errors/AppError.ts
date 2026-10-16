import { z } from 'zod'
import { isErrorLike } from './isErrorLike'

const zSourceRef = z.object({
  providerConfigId: z.string(),
  manifestId: z.string(),
  name: z.string(),
})

export type SourceRef = z.infer<typeof zSourceRef>

const zSourceUnavailableReason = z.enum([
  'not-registered',
  'needs-newer-extension',
  'invalid-manifest',
])

export type SourceUnavailableReason = z.infer<typeof zSourceUnavailableReason>

const zManifestPipeline = z.enum([
  'search',
  'season',
  'episodes',
  'parseUrl',
  'danmaku',
  'loginProbe',
])

export type ManifestPipeline = z.infer<typeof zManifestPipeline>

const zManifestOutputFailure = z.enum([
  'not-array',
  'no-valid-rows',
  'invalid-output',
])

export type ManifestOutputFailure = z.infer<typeof zManifestOutputFailure>

const zManifestRejection = z.enum([
  'save-invalid',
  'save-needs-newer-extension',
  'save-id-changed',
  'save-duplicate-id',
  'save-not-user',
  'delete-not-user',
  'reinstall-not-broken',
])

export type ManifestRejection = z.infer<typeof zManifestRejection>

// These names are also stored, in the upgrade run record, so renaming one
// strands the records already written.
const zOptionsStorageProblem = z.enum([
  // One stored item would pass the browser's per-item limit
  'options.itemTooLarge',
  // The storage area is out of bytes or items
  'options.storeFull',
  'options.writeRateLimited',
  // A store split over several items is missing some of them or they do not
  // match, as while another device's write is still syncing in
  'options.incomplete',
])

export type OptionsStorageProblem = z.infer<typeof zOptionsStorageProblem>

export const zUpgradeProblem = z.union([
  zOptionsStorageProblem,
  z.literal('options.migration'),
  z.literal('unknown'),
])

export type UpgradeProblem = z.infer<typeof zUpgradeProblem>

export const OPTIONS_STORAGE_PROBLEMS = zOptionsStorageProblem.options

const zTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('source'), ref: zSourceRef }),
  z.object({ kind: z.literal('catalog') }),
  z.object({ kind: z.literal('cloud') }),
])

export type ErrorTarget = z.infer<typeof zTarget>

export function sourceTarget(ref: SourceRef): ErrorTarget {
  return { kind: 'source', ref }
}

const zNoParams = z.object({})

// dango's ConfigIssue. The code stays a string so an issue code a newer
// engine adds still rehydrates.
const zConfigIssue = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

export type AppConfigIssue = z.infer<typeof zConfigIssue>
const zTransport = z.object({ target: zTarget.optional() })
const zSource = z.object({ source: zSourceRef })
// An option store by its storage key
const zStore = z.object({ store: z.string() })
const zTitle = z.object({ title: z.string() })

const PARAMS = {
  network: zTransport,
  http: zTransport.extend({ status: z.number().int() }),
  timeout: zTransport,
  aborted: zNoParams,
  hostNotAllowed: zSource,
  'rpc.unreachable': zNoParams,
  'source.removed': zNoParams,
  'source.noUrlParser': zNoParams,
  'source.urlEpisodeNotFound': zNoParams,
  'source.urlTitleNotFound': zSource,
  'source.unavailable': zSource.extend({ reason: zSourceUnavailableReason }),
  'source.searchUnsupported': zSource,
  'source.episodesUnsupported': zSource,
  'source.danmakuUnsupported': zSource,
  'source.seasonRefreshUnsupported': zSource,
  'source.noDanmaku': zTitle,
  badResponse: zTransport,
  'manifest.unavailable': z.object({
    manifestId: z.string(),
    reason: zSourceUnavailableReason,
  }),
  'manifest.badOutput': z.object({
    manifestId: z.string(),
    pipeline: zManifestPipeline,
    reason: zManifestOutputFailure,
    detail: z.string(),
    // Absent for an unsaved manifest run from the editor.
    source: zSourceRef.optional(),
  }),
  'manifest.rejected': z.object({
    reason: zManifestRejection,
    detail: z.string().optional(),
  }),
  'match.notFound': zTitle,
  'catalog.empty': zNoParams,
  'config.duplicate': z.object({ manifestId: z.string().optional() }),
  'config.notFound': z.object({ id: z.string().optional() }),
  'config.invalid': z.object({ issues: z.array(zConfigIssue) }),
  'config.nameRequired': zNoParams,
  'config.nameTooLong': z.object({ max: z.number() }),
  'config.notBuiltin': z.object({ manifestId: z.string() }),
  'config.orderMismatch': zNoParams,
  'options.itemTooLarge': zStore,
  'options.storeFull': zStore,
  'options.writeRateLimited': zStore,
  'options.incomplete': zStore,
  'options.migration': zStore,
  'options.upgradeFailed': z.object({
    stores: z.array(z.object({ store: z.string(), problem: zUpgradeProblem })),
  }),
  'options.outdated': z.object({
    store: z.string(),
    version: z.number(),
    expected: z.number(),
  }),
  'catalog.applyFailed': z.object({
    sources: z.array(z.object({ manifestId: z.string(), name: z.string() })),
  }),
  'backup.notJson': zNoParams,
  'backup.invalidFormat': zNoParams,
  'backup.unsupportedVersion': zNoParams,
  'backup.recoveryUnrestorable': zStore,
  'mount.noActiveFrame': zNoParams,
  'mount.failed': zNoParams,
  'shareCode.invalid': zNoParams,
  'importUrl.invalidUrl': zNoParams,
  'importUrl.invalidScheme': zNoParams,
  'importUrl.unsupportedExtension': zNoParams,
  'importUrl.tooLarge': z.object({ limit: z.string() }),
} satisfies Record<string, z.ZodType>

export type AppErrorCode = keyof typeof PARAMS

export type AppErrorParams = {
  [C in AppErrorCode]: z.infer<(typeof PARAMS)[C]>
}

export const APP_ERROR_CODES = Object.keys(PARAMS) as AppErrorCode[]

interface AppErrorOptions {
  message?: string
  cause?: unknown
}

export type AppErrorParamsArg<C extends AppErrorCode> =
  Record<never, never> extends AppErrorParams[C]
    ? [params?: AppErrorParams[C]]
    : [params: AppErrorParams[C]]

type AppErrorArgs<C extends AppErrorCode> = [
  ...AppErrorParamsArg<C>,
  options?: AppErrorOptions,
]

function logMessage(code: AppErrorCode, options?: AppErrorOptions): string {
  const cause = options?.cause
  const detail =
    options?.message ?? (isErrorLike(cause) ? cause.message : undefined)
  return detail ? `${code}: ${detail}` : code
}

// The message is for logs only, and starts with the code so a log line can be
// matched on it. User-facing text comes from describeError.
export class AppError<C extends AppErrorCode = AppErrorCode> extends Error {
  readonly code: C
  readonly params: AppErrorParams[C]

  constructor(code: C, ...args: AppErrorArgs<C>) {
    const [params, options] = args as unknown as [
      AppErrorParams[C] | undefined,
      AppErrorOptions | undefined,
    ]
    super(logMessage(code, options), { cause: options?.cause })
    this.name = 'AppError'
    this.code = code
    this.params = params ?? ({} as AppErrorParams[C])
  }
}

// Rebuilds an AppError from untrusted parts, such as a serialized RPC
// response. Parts that do not match a known code and its params are
// rejected, so the caller keeps them as an unclassified error.
export function appErrorFromParts(
  code: unknown,
  params: unknown,
  options: AppErrorOptions
): AppError | undefined {
  if (typeof code !== 'string' || !Object.hasOwn(PARAMS, code)) {
    return undefined
  }
  const known = code as AppErrorCode
  const parsed = PARAMS[known].safeParse(params)
  if (!parsed.success) {
    return undefined
  }
  const error = new AppError(known, parsed.data as never, {
    cause: options.cause,
  })
  if (options.message !== undefined) {
    error.message = options.message
  }
  return error
}
