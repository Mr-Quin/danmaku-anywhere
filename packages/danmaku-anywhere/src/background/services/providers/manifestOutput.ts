import { AppError, type ManifestOutputFailure } from '@/common/errors/AppError'
import type { ManifestOutputSource } from './manifestErrors'

interface OutputIssue {
  path: readonly PropertyKey[]
  message: string
  expected?: unknown
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

// Optional fields that only decorate a row. Sources fill them from loosely
// typed upstream APIs (a count as "28", a year as null), so a value of the
// wrong shape is dropped, or a plain count read from its string, instead of
// costing the whole row. Identity and required fields are never touched.
const PRESENTATIONAL_FIELDS: ReadonlySet<string> = new Set([
  'type',
  'imageUrl',
  'episodeCount',
  'year',
  'alternativeTitles',
  'alternativeTitle',
  'externalLink',
])

// Called with the field paths a parse had to repair, for the log.
export type OnRepair = (paths: string[]) => void

const MAX_REPAIRS = 16

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parentAt(
  root: unknown,
  path: readonly PropertyKey[]
): Record<string, unknown> | undefined {
  let node = root
  for (const key of path) {
    if (!isRecord(node) || typeof key !== 'string') {
      return undefined
    }
    node = node[key]
  }
  return isRecord(node) ? node : undefined
}

function repairValue(issue: OutputIssue, value: unknown): unknown {
  if (
    issue.expected === 'number' &&
    typeof value === 'string' &&
    /^\d+$/.test(value)
  ) {
    return Number(value)
  }
  return undefined
}

type RepairedParse<T> =
  | { success: true; data: T; repaired: string[] }
  | { success: false; issues: readonly OutputIssue[] }

// Parses `value`, repairing presentational fields the schema rejects. A
// field the schema still rejects once removed was not optional, so the
// parse fails as it would have without the repair.
function parseRepairing<T>(
  schema: OutputSchema<T>,
  value: unknown
): RepairedParse<T> {
  let current = value
  const repaired: string[] = []
  for (let attempt = 0; attempt < MAX_REPAIRS; attempt++) {
    const parsed = schema.safeParse(current)
    if (parsed.success) {
      return { success: true, data: parsed.data, repaired }
    }
    const issue = parsed.error.issues[0]
    const key = issue.path.at(-1)
    const path = issue.path.map(String).join('.')
    if (
      typeof key !== 'string' ||
      !PRESENTATIONAL_FIELDS.has(key) ||
      repaired.includes(path)
    ) {
      return { success: false, issues: parsed.error.issues }
    }
    if (repaired.length === 0) {
      current = structuredClone(current)
    }
    const parent = parentAt(current, issue.path.slice(0, -1))
    if (parent === undefined || !(key in parent)) {
      return { success: false, issues: parsed.error.issues }
    }
    const replacement = repairValue(issue, parent[key])
    if (replacement === undefined) {
      delete parent[key]
    } else {
      parent[key] = replacement
    }
    repaired.push(path)
  }
  const parsed = schema.safeParse(current)
  if (parsed.success) {
    return { success: true, data: parsed.data, repaired }
  }
  return { success: false, issues: parsed.error.issues }
}

function describeIssue(issues: readonly OutputIssue[]): string {
  const [issue] = issues
  if (issue.path.length === 0) {
    return issue.message
  }
  return `${issue.path.map(String).join('.')}: ${issue.message}`
}

function outputError(
  { manifestId, pipeline, source }: ManifestOutputSource,
  reason: ManifestOutputFailure,
  detail: string
): AppError<'manifest.badOutput'> {
  return new AppError(
    'manifest.badOutput',
    { manifestId, pipeline, reason, detail, source },
    { message: `Manifest ${manifestId} ${pipeline} output ${detail}` }
  )
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
  onRepair?: OnRepair
): ParsedRows<T> {
  if (!Array.isArray(output)) {
    throw outputError(
      source,
      'not-array',
      `is not an array, got ${describeType(output)}`
    )
  }
  const rows: T[] = []
  let firstIssue: string | undefined
  const repaired = new Set<string>()
  output.forEach((row, index) => {
    const parsed = parseRepairing(schema, row)
    if (parsed.success) {
      rows.push(parsed.data)
      for (const path of parsed.repaired) {
        repaired.add(path)
      }
      return
    }
    if (firstIssue === undefined) {
      firstIssue = `[${index}] ${describeIssue(parsed.issues)}`
    }
  })
  if (repaired.size > 0) {
    onRepair?.([...repaired])
  }
  if (firstIssue === undefined) {
    return { rows }
  }
  const count = output.length - rows.length
  if (rows.length === 0) {
    throw outputError(
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
  source: ManifestOutputSource,
  onRepair?: OnRepair
): T {
  const parsed = parseRepairing(schema, output)
  if (!parsed.success) {
    throw outputError(
      source,
      'invalid-output',
      `is invalid, ${describeIssue(parsed.issues)}`
    )
  }
  if (parsed.repaired.length > 0) {
    onRepair?.(parsed.repaired)
  }
  return parsed.data
}

export function describeDroppedRows(
  source: ManifestOutputSource,
  dropped: DroppedRows
): string {
  return `Dropped ${dropped.count} of ${dropped.total} ${source.pipeline} row(s) from manifest ${source.manifestId}, first: ${dropped.firstIssue}`
}
