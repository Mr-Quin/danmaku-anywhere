import { describe, expect, it } from 'vitest'
import { AppError } from '@/common/errors/AppError'
import { offersSearch } from './useErrorToastAction'

describe('offersSearch', () => {
  it('offers the search page for a source failure or an unclassified error', () => {
    expect(offersSearch(new AppError('network', {}))).toBe(true)
    expect(offersSearch(new AppError('source.noDanmaku', { title: 'x' }))).toBe(
      true
    )
    expect(offersSearch(new Error('boom'))).toBe(true)
  })

  it('does not offer it where another source would not help', () => {
    expect(offersSearch(new AppError('mount.failed'))).toBe(false)
    expect(offersSearch(new AppError('backup.notJson'))).toBe(false)
    expect(offersSearch(new AppError('rpc.unreachable'))).toBe(false)
  })
})
