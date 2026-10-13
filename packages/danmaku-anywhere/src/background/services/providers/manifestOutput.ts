import type { ILogger } from '@/common/Logger'

export type ManifestPipeline =
  | 'search'
  | 'season'
  | 'episodes'
  | 'parseUrl'
  | 'danmaku'

export interface ManifestOutputSource {
  manifestId: string
  pipeline: ManifestPipeline
}

interface OutputIssue {
  path: readonly PropertyKey[]
  message: string
}

// Structural so dango's schemas fit regardless of which zod copy built them.
export interface OutputSchema<T> {
  safeParse(
    value: unknown
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: readonly OutputIssue[] } }
}

export class ManifestOutputError extends Error {
  constructor(
    readonly manifestId: string,
    readonly pipeline: ManifestPipeline,
    detail: string
  ) {
    super(`Manifest ${manifestId} ${pipeline} output ${detail}`)
    this.name = 'ManifestOutputError'
  }
}

function describeIssue(issues: readonly OutputIssue[]): string {
  const [issue] = issues
  if (issue.path.length === 0) {
    return issue.message
  }
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

function describeType(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  return typeof value
}

/**
 * A list output keeps its valid rows: one malformed search hit or episode
 * should not hide the rest. A non-array output, or a non-empty one with no
 * valid row, means the pipeline itself is broken and fails the run.
 */
export function parseOutputRows<T>(
  schema: OutputSchema<T>,
  output: unknown,
  source: ManifestOutputSource,
  logger: ILogger
): T[] {
  const { manifestId, pipeline } = source
  if (!Array.isArray(output)) {
    throw new ManifestOutputError(
      manifestId,
      pipeline,
      `is not an array, got ${describeType(output)}`
    )
  }
  const rows: T[] = []
  let firstIssue: string | undefined
  output.forEach((row, index) => {
    const parsed = schema.safeParse(row)
    if (parsed.success) {
      rows.push(parsed.data)
      return
    }
    if (firstIssue === undefined) {
      firstIssue = `[${index}] ${describeIssue(parsed.error.issues)}`
    }
  })
  const dropped = output.length - rows.length
  if (dropped === 0) {
    return rows
  }
  if (rows.length === 0) {
    throw new ManifestOutputError(
      manifestId,
      pipeline,
      `has no valid rows (${dropped} invalid), first: ${firstIssue}`
    )
  }
  logger.warn(
    `Dropped ${dropped} of ${output.length} ${pipeline} row(s) from manifest ${manifestId}, first: ${firstIssue}`
  )
  return rows
}

export function parseOutputValue<T>(
  schema: OutputSchema<T>,
  output: unknown,
  source: ManifestOutputSource
): T {
  const parsed = schema.safeParse(output)
  if (!parsed.success) {
    throw new ManifestOutputError(
      source.manifestId,
      source.pipeline,
      `is invalid, ${describeIssue(parsed.error.issues)}`
    )
  }
  return parsed.data
}
