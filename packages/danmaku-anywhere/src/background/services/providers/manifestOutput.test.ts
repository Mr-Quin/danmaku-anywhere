import { zParseUrlOutput, zSearchRow, zSeasonRow } from '@mr-quin/dango'
import { describe, expect, it, vi } from 'vitest'
import { AppError } from '@/common/errors/AppError'
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
  pipeline: 'search',
  source: { providerConfigId: 'acme-1', manifestId: 'acme', name: 'Acme' },
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

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      params: { reason: 'no-valid-rows' },
      message:
        'manifest.badOutput: Manifest acme search output has no valid rows (1 invalid), first: [0] indexedId: Invalid input: expected string, received number',
    })
  })

  it('fails the run when the output is not an array', () => {
    const error = catchError(() =>
      parseOutputRows(zSearchRow, undefined, source)
    )

    expect(error).toMatchObject({
      params: { reason: 'not-array' },
      message:
        'manifest.badOutput: Manifest acme search output is not an array, got undefined',
    })
  })

  it('names the manifest, source and pipeline on the error', () => {
    const error = catchError(() => parseOutputRows(zSearchRow, null, source))

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'manifest.badOutput',
      params: {
        manifestId: 'acme',
        pipeline: 'search',
        source: { providerConfigId: 'acme-1' },
      },
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

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      params: { reason: 'invalid-output', source: undefined },
      message:
        'manifest.badOutput: Manifest acme season output is invalid, providerIds: Invalid input: expected record, received string',
    })
  })

  it('describes an issue at the root without a path', () => {
    expect(() => parseOutputValue(zSeasonRow, 'x', seasonSource)).toThrow(
      'Manifest acme season output is invalid, Invalid input: expected object, received string'
    )
  })
})

describe('optional presentational fields', () => {
  // A live Tencent cover link (v.qq.com/x/cover/mzc00200k4cgltp/y0047bg48g9.html)
  // sends its episode count as a string, and "" for a film.
  const tencentParse = {
    seasonInsert: {
      providerIds: { cid: 'mzc00200k4cgltp' },
      indexedId: 'mzc00200k4cgltp',
      title: '地球脉动 第3季[普通话版]',
      type: '1',
      imageUrl:
        'https://puui.qpic.cn/vcover_vt_pic/0/mzc00200s9hvibp1698046483704/0',
      episodeCount: '8',
    },
    episodeMeta: {
      providerIds: { vid: 'y0047bg48g9' },
      indexedId: 'y0047bg48g9',
      title: '【中文版】第1集：海陆之间',
      episodeNumber: '【中文版】第1集：海陆之间',
      alternativeTitle: ['【中文版】第1集：海陆之间'],
    },
  }
  const parseSource = { manifestId: 'tencent', pipeline: 'parseUrl' } as const

  it('reads a plain count from its string', () => {
    const onRepair = vi.fn()

    const parsed = parseOutputValue(
      zParseUrlOutput,
      tencentParse,
      parseSource,
      onRepair
    )

    expect(parsed.seasonInsert.episodeCount).toBe(8)
    expect(onRepair).toHaveBeenCalledWith(['seasonInsert.episodeCount'])
    expect(tencentParse.seasonInsert.episodeCount).toBe('8')
  })

  it('drops a count that is not a plain number', () => {
    for (const episodeCount of ['', '1.5', '-3', '28集']) {
      const parsed = parseOutputValue(
        zParseUrlOutput,
        {
          ...tencentParse,
          seasonInsert: { ...tencentParse.seasonInsert, episodeCount },
        },
        parseSource
      )

      expect(parsed.seasonInsert).not.toHaveProperty('episodeCount')
      expect(parsed.seasonInsert.indexedId).toBe('mzc00200k4cgltp')
    }
  })

  it('keeps a migu search row whose year is null, without the year', () => {
    const { rows, dropped } = parseOutputRows(
      zSearchRow,
      [{ ...row, year: null, imageUrl: 42 }],
      { manifestId: 'migu', pipeline: 'search' }
    )

    expect(dropped).toBeUndefined()
    expect(rows).toEqual([row])
  })

  it('never repairs an identity or required field', () => {
    const { rows, dropped } = parseOutputRows(
      zSearchRow,
      [row, { ...row, indexedId: 7 }, { ...row, title: null }],
      { manifestId: 'migu', pipeline: 'search' }
    )

    expect(rows).toEqual([row])
    expect(dropped?.count).toBe(2)
  })
})
