export type SourceProblem =
  | 'sourceRemoved'
  | 'sourceUnavailable'
  | 'noUrlParser'
  | 'searchUnsupported'
  | 'episodesUnsupported'
  | 'danmakuUnsupported'
  | 'seasonRefreshUnsupported'

const SOURCE_PROBLEMS: readonly SourceProblem[] = [
  'sourceRemoved',
  'sourceUnavailable',
  'noUrlParser',
  'searchUnsupported',
  'episodesUnsupported',
  'danmakuUnsupported',
  'seasonRefreshUnsupported',
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

export function getSourceError(
  error: unknown
): { problem: SourceProblem; sourceName?: string } | undefined {
  for (let current = error; current instanceof Error; ) {
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
    current = current.cause
  }
  return undefined
}
