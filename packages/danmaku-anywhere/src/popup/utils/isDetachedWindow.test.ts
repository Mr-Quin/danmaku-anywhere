import { afterEach, describe, expect, it } from 'vitest'
import { isDetachedWindow } from './isDetachedWindow'

/**
 * Pins the contract used to distinguish a chrome.windows.create popup from
 * the toolbar action popup: `?detached=1` on window.location.search.
 */

const originalSearch = window.location.search

afterEach(() => {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${originalSearch}${window.location.hash}`
  )
})

function setSearch(search: string) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${search}${window.location.hash}`
  )
}

describe('isDetachedWindow', () => {
  it('returns false when there is no query string', () => {
    setSearch('')
    expect(isDetachedWindow()).toBe(false)
  })

  it('returns true when the query has detached=1', () => {
    setSearch('?detached=1')
    expect(isDetachedWindow()).toBe(true)
  })

  it('returns false when the query has detached=0', () => {
    setSearch('?detached=0')
    expect(isDetachedWindow()).toBe(false)
  })
})
