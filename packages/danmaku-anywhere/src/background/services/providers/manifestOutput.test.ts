import { zSearchRow, zSeasonRow } from '@mr-quin/dango'
import { describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { silentLogger } from '@/tests/silentLogger'
import {
  ManifestOutputError,
  parseOutputRows,
  parseOutputValue,
} from './manifestOutput'

const source = { manifestId: 'acme', pipeline: 'search' } as const

const row = { indexedId: '1', title: 'Frieren', providerIds: { id: 1 } }

function makeLogger(): { logger: ILogger; warn: ReturnType<typeof vi.fn> } {
  const warn = vi.fn()
  return { logger: { ...silentLogger, warn }, warn }
}

describe('parseOutputRows', () => {
  it('returns every row when all of them match the schema', () => {
    const { logger, warn } = makeLogger()

    const rows = parseOutputRows(zSearchRow, [row, row], source, logger)

    expect(rows).toEqual([row, row])
    expect(warn).not.toHaveBeenCalled()
  })

  it('returns an empty list for an empty output', () => {
    const { logger, warn } = makeLogger()

    expect(parseOutputRows(zSearchRow, [], source, logger)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('drops invalid rows and logs the count with the manifest and pipeline', () => {
    const { logger, warn } = makeLogger()

    const rows = parseOutputRows(
      zSearchRow,
      [row, { ...row, indexedId: 123 }, { ...row, title: undefined }],
      source,
      logger
    )

    expect(rows).toEqual([row])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      'Dropped 2 of 3 search row(s) from manifest acme, first: [1] indexedId: Invalid input: expected string, received number'
    )
  })

  it('fails the run when every row of a non-empty output is invalid', () => {
    const { logger } = makeLogger()

    const run = () =>
      parseOutputRows(zSearchRow, [{ ...row, indexedId: 123 }], source, logger)

    expect(run).toThrow(ManifestOutputError)
    expect(run).toThrow(
      'Manifest acme search output has no valid rows (1 invalid), first: [0] indexedId: Invalid input: expected string, received number'
    )
  })

  it('fails the run when the output is not an array', () => {
    const { logger } = makeLogger()

    const run = () => parseOutputRows(zSearchRow, undefined, source, logger)

    expect(run).toThrow(ManifestOutputError)
    expect(run).toThrow(
      'Manifest acme search output is not an array, got undefined'
    )
  })

  it('names the manifest and pipeline on the error', () => {
    const { logger } = makeLogger()

    try {
      parseOutputRows(zSearchRow, null, source, logger)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestOutputError)
      expect(error).toMatchObject({
        name: 'ManifestOutputError',
        manifestId: 'acme',
        pipeline: 'search',
      })
    }
  })
})

describe('parseOutputValue', () => {
  const seasonSource = { manifestId: 'acme', pipeline: 'season' } as const

  it('returns a value that matches the schema', () => {
    expect(parseOutputValue(zSeasonRow, row, seasonSource)).toEqual(row)
  })

  it('fails on a value that does not match', () => {
    const run = () =>
      parseOutputValue(zSeasonRow, { ...row, providerIds: 'x' }, seasonSource)

    expect(run).toThrow(ManifestOutputError)
    expect(run).toThrow(
      'Manifest acme season output is invalid, providerIds: Invalid input: expected record, received string'
    )
  })

  it('describes an issue at the root without a path', () => {
    expect(() => parseOutputValue(zSeasonRow, 'x', seasonSource)).toThrow(
      'Manifest acme season output is invalid, Invalid input: expected object, received string'
    )
  })
})
