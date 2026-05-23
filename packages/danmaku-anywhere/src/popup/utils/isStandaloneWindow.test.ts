import { afterEach, describe, expect, it } from 'vitest'
import { isStandaloneWindow } from './isStandaloneWindow'

/**
 * Verifies the popup uses the `?standalone=1` query on `window.location` to
 * tell whether it is running inside a detached `chrome.windows.create` window
 * (vs. the toolbar popup). Only the literal `1` counts; any other value or
 * missing query reads as "not standalone".
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

describe('isStandaloneWindow', () => {
  it('returns false when there is no query string', () => {
    setSearch('')
    expect(isStandaloneWindow()).toBe(false)
  })

  it('returns true when the query has standalone=1', () => {
    setSearch('?standalone=1')
    expect(isStandaloneWindow()).toBe(true)
  })

  it('returns false when the query has standalone=0', () => {
    setSearch('?standalone=0')
    expect(isStandaloneWindow()).toBe(false)
  })
})
