import type { ConfigIssue } from '@mr-quin/dango'

export interface ProviderConfigErrorParams {
  'config.invalid': { issues: ConfigIssue[] }
  'config.nameRequired': Record<string, never>
  'config.notFound': { id: string }
  'config.duplicate': { manifestId: string }
  'config.notBuiltin': { manifestId: string }
  'config.unknownSource': { manifestId: string }
  'config.orderMismatch': Record<string, never>
}

export type ProviderConfigErrorCode = keyof ProviderConfigErrorParams

export type ProviderConfigErrorDetail = {
  [C in ProviderConfigErrorCode]: {
    code: C
    params: ProviderConfigErrorParams[C]
  }
}[ProviderConfigErrorCode]

const PROVIDER_CONFIG_ERROR_NAME = 'ProviderConfigError'

const CODES: readonly ProviderConfigErrorCode[] = [
  'config.invalid',
  'config.nameRequired',
  'config.notFound',
  'config.duplicate',
  'config.notBuiltin',
  'config.unknownSource',
  'config.orderMismatch',
]

// The RPC client hands callers a plain error, so they read the code and params
// off it through getProviderConfigError rather than with instanceof.
export class ProviderConfigError extends Error {
  readonly code: ProviderConfigErrorCode
  readonly params: ProviderConfigErrorDetail['params']

  constructor(detail: ProviderConfigErrorDetail, message: string) {
    super(message)
    this.name = PROVIDER_CONFIG_ERROR_NAME
    this.code = detail.code
    this.params = detail.params
  }
}

function isCode(value: unknown): value is ProviderConfigErrorCode {
  return CODES.some((code) => code === value)
}

export function getProviderConfigError(
  error: unknown
): ProviderConfigErrorDetail | undefined {
  for (let current = error; current instanceof Error; ) {
    if (
      current.name === PROVIDER_CONFIG_ERROR_NAME &&
      'code' in current &&
      isCode(current.code) &&
      'params' in current &&
      typeof current.params === 'object' &&
      current.params !== null
    ) {
      return {
        code: current.code,
        params: current.params,
      } as ProviderConfigErrorDetail
    }
    current = current.cause
  }
  return undefined
}
