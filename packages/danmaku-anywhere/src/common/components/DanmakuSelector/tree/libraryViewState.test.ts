import { describe, expect, it } from 'vitest'
import { danmakuSourceTypeList } from '@/common/danmaku/enums'
import { libraryViewState } from './libraryViewState'

/**
 * Which state the library shows: the tree when anything is visible, "no
 * matches" when a non-empty library is hidden by the text or source filter,
 * and the empty-library prompt otherwise.
 */

const allTypes = danmakuSourceTypeList

describe('libraryViewState', () => {
  it('shows the tree when items are visible', () => {
    expect(
      libraryViewState({
        visibleItemCount: 3,
        libraryItemCount: 3,
        filter: 'abc',
        typeFilter: allTypes,
      })
    ).toBe('tree')
  })

  it('shows no matches when the text filter hides everything', () => {
    expect(
      libraryViewState({
        visibleItemCount: 0,
        libraryItemCount: 3,
        filter: 'zzz',
        typeFilter: allTypes,
      })
    ).toBe('noMatch')
  })

  it('shows no matches when the source filter hides everything', () => {
    expect(
      libraryViewState({
        visibleItemCount: 0,
        libraryItemCount: 3,
        filter: '',
        typeFilter: allTypes.slice(1),
      })
    ).toBe('noMatch')
  })

  it('shows the empty library when there is nothing stored', () => {
    expect(
      libraryViewState({
        visibleItemCount: 0,
        libraryItemCount: 0,
        filter: 'zzz',
        typeFilter: allTypes,
      })
    ).toBe('empty')
  })

  it('shows the empty library when nothing is filtered out', () => {
    expect(
      libraryViewState({
        visibleItemCount: 0,
        libraryItemCount: 2,
        filter: '  ',
        typeFilter: allTypes,
      })
    ).toBe('empty')
  })
})
