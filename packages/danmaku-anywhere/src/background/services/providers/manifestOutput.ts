import {
  ManifestOutputError,
  type ManifestOutputSource,
} from './manifestErrors'

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

export interface DroppedRows {
  count: number
  total: number
  firstIssue: string
}

export interface ParsedRows<T> {
  rows: T[]
  // Absent when every row was valid.
  dropped?: DroppedRows
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
  source: ManifestOutputSource
): ParsedRows<T> {
  if (!Array.isArray(output)) {
    throw new ManifestOutputError(
      source,
      'not-array',
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
  if (firstIssue === undefined) {
    return { rows }
  }
  const count = output.length - rows.length
  if (rows.length === 0) {
    throw new ManifestOutputError(
      source,
      'no-valid-rows',
      `has no valid rows (${count} invalid), first: ${firstIssue}`
    )
  }
  return { rows, dropped: { count, total: output.length, firstIssue } }
}

export function parseOutputValue<T>(
  schema: OutputSchema<T>,
  output: unknown,
  source: ManifestOutputSource
): T {
  const parsed = schema.safeParse(output)
  if (!parsed.success) {
    throw new ManifestOutputError(
      source,
      'invalid-output',
      `is invalid, ${describeIssue(parsed.error.issues)}`
    )
  }
  return parsed.data
}

export function describeDroppedRows(
  source: ManifestOutputSource,
  dropped: DroppedRows
): string {
  return `Dropped ${dropped.count} of ${dropped.total} ${source.pipeline} row(s) from manifest ${source.manifestId}, first: ${dropped.firstIssue}`
}
