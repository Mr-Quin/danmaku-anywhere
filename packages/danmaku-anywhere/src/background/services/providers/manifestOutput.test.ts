import { zSearchRow, zSeasonRow } from '@mr-quin/dango'
import { describe, expect, it } from 'vitest'
import { ManifestOutputError } from './manifestErrors'
import {
  describeDroppedRows,
  parseOutputRows,
  parseOutputValue,
} from './manifestOutput'

/**
 * The output policy at the dango boundary: list outputs keep their valid rows
 * and report what was dropped, a non-array or all-invalid list fails, and a
 * single value either matches its schema or fails. Every failure carries the
 * manifest, config and pipeline plus a stable reason.
 */

const source = {
  manifestId: 'acme',
  providerConfigId: 'acme-1',
  pipeline: 'search',
} as const

const row = { indexedId: '1', title: 'Frieren', providerIds: { id: 1 } }

function catchError(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}

describe('parseOutputRows', () => {
  it('returns every row and no drop report when all of them match', () => {
    expect(parseOutputRows(zSearchRow, [row, row], source)).toEqual({
      rows: [row, row],
    })
  })

  it('returns an empty list for an empty output', () => {
    expect(parseOutputRows(zSearchRow, [], source)).toEqual({ rows: [] })
  })

  it('drops invalid rows and reports the count and first issue', () => {
    const parsed = parseOutputRows(
      zSearchRow,
      [row, { ...row, indexedId: 123 }, { ...row, title: undefined }],
      source
    )
    const dropped = {
      count: 2,
      total: 3,
      firstIssue:
        '[1] indexedId: Invalid input: expected string, received number',
    }

    expect(parsed).toEqual({ rows: [row], dropped })
    expect(describeDroppedRows(source, dropped)).toBe(
      'Dropped 2 of 3 search row(s) from manifest acme, first: [1] indexedId: Invalid input: expected string, received number'
    )
  })

  it('fails the run when every row of a non-empty output is invalid', () => {
    const error = catchError(() =>
      parseOutputRows(zSearchRow, [{ ...row, indexedId: 123 }], source)
    )

    expect(error).toBeInstanceOf(ManifestOutputError)
    expect(error).toMatchObject({
      reason: 'no-valid-rows',
      message:
        'Manifest acme search output has no valid rows (1 invalid), first: [0] indexedId: Invalid input: expected string, received number',
    })
  })

  it('fails the run when the output is not an array', () => {
    const error = catchError(() =>
      parseOutputRows(zSearchRow, undefined, source)
    )

    expect(error).toMatchObject({
      reason: 'not-array',
      message: 'Manifest acme search output is not an array, got undefined',
    })
  })

  it('names the manifest, config and pipeline on the error', () => {
    const error = catchError(() => parseOutputRows(zSearchRow, null, source))

    expect(error).toBeInstanceOf(ManifestOutputError)
    expect(error).toMatchObject({
      name: 'ManifestOutputError',
      manifestId: 'acme',
      providerConfigId: 'acme-1',
      pipeline: 'search',
    })
  })
})

describe('parseOutputValue', () => {
  const seasonSource = { manifestId: 'acme', pipeline: 'season' } as const

  it('returns a value that matches the schema', () => {
    expect(parseOutputValue(zSeasonRow, row, seasonSource)).toEqual(row)
  })

  it('fails on a value that does not match', () => {
    const error = catchError(() =>
      parseOutputValue(zSeasonRow, { ...row, providerIds: 'x' }, seasonSource)
    )

    expect(error).toBeInstanceOf(ManifestOutputError)
    expect(error).toMatchObject({
      reason: 'invalid-output',
      providerConfigId: undefined,
      message:
        'Manifest acme season output is invalid, providerIds: Invalid input: expected record, received string',
    })
  })

  it('describes an issue at the root without a path', () => {
    expect(() => parseOutputValue(zSeasonRow, 'x', seasonSource)).toThrow(
      'Manifest acme season output is invalid, Invalid input: expected object, received string'
    )
  })
})
