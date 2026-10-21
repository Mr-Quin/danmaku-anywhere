import { isNetworkError } from '@/common/utils/networkError'

export type SourceProblem =
  | 'sourceRemoved'
  | 'noUrlParser'
  | 'episodesUnsupported'
  | 'refetchUnsupported'

const SOURCE_PROBLEMS: readonly SourceProblem[] = [
  'sourceRemoved',
  'noUrlParser',
  'episodesUnsupported',
  'refetchUnsupported',
]

const SOURCE_ERROR_NAME = 'SourceError'

// Callers across the RPC boundary get a plain Error back, so they match on the
// name and problem, not instanceof.
export class SourceError extends Error {
  constructor(
    readonly problem: SourceProblem,
    message: string,
    readonly sourceName?: string
  ) {
    super(message)
    this.name = SOURCE_ERROR_NAME
  }
}

function isSourceProblem(value: unknown): value is SourceProblem {
  return SOURCE_PROBLEMS.some((problem) => problem === value)
}

// Errors cross the RPC boundary as plain Errors with the original attached as
// `cause`, and the provider's error can be wrapped again inside that.
function* errorChain(error: unknown): Generator<Error> {
  let current = error
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    yield current
    current = current.cause
  }
}

export function getSourceError(
  error: unknown
): { problem: SourceProblem; sourceName?: string } | undefined {
  for (const current of errorChain(error)) {
    if (
      current.name === SOURCE_ERROR_NAME &&
      'problem' in current &&
      isSourceProblem(current.problem)
    ) {
      const sourceName =
        'sourceName' in current && typeof current.sourceName === 'string'
          ? current.sourceName
          : undefined
      return { problem: current.problem, sourceName }
    }
  }
  return undefined
}

const HTTP_FAILURE = /\bHTTP \d{3}\b|Request failed with status \d{3}/

export function isUnreachableError(error: unknown): boolean {
  for (const current of errorChain(error)) {
    if (current.name === 'HttpException') {
      return true
    }
    if (isNetworkError(current) || HTTP_FAILURE.test(current.message)) {
      return true
    }
  }
  return false
}
