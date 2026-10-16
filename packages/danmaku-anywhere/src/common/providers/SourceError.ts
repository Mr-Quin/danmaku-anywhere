export type SourceProblem =
  | 'sourceRemoved'
  | 'sourceUnavailable'
  | 'noUrlParser'
  | 'searchUnsupported'
  | 'episodesUnsupported'
  | 'danmakuUnsupported'
  | 'seasonRefreshUnsupported'

const SOURCE_ERROR_NAME = 'SourceError'

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
