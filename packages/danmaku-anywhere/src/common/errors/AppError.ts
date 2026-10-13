import { z } from 'zod'

const zSourceRef = z.object({
  providerConfigId: z.string(),
  manifestId: z.string(),
  name: z.string(),
})

export type SourceRef = z.infer<typeof zSourceRef>

const zTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('source'), ref: zSourceRef }),
  z.object({ kind: z.literal('catalog') }),
  z.object({ kind: z.literal('cloud') }),
])

export type ErrorTarget = z.infer<typeof zTarget>

const zNoParams = z.object({})
const zTransport = z.object({ target: zTarget.optional() })
const zSource = z.object({ source: zSourceRef })
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
  'source.episodesUnsupported': zSource,
  'source.refetchUnsupported': zSource,
  'source.noDanmaku': zTitle,
  'source.badResponse': zTransport,
  'match.notFound': zTitle,
  'catalog.empty': zNoParams,
  'catalog.applyFailed': z.object({
    sources: z.array(z.object({ manifestId: z.string(), name: z.string() })),
  }),
  'backup.notJson': zNoParams,
  'backup.invalidFormat': zNoParams,
  'backup.unsupportedVersion': zNoParams,
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
    options?.message ?? (cause instanceof Error ? cause.message : undefined)
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
