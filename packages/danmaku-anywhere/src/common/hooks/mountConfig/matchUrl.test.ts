import { expect, describe, it } from 'vitest'
import 'urlpattern-polyfill'

import { matchUrl } from '@/common/hooks/mountConfig/matchUrl'

describe('matchUrl', () => {
  it('should match with exact http URL', () => {
    const url = 'http://www.example.com/'
    const pattern = 'http://www.example.com/'
    expect(matchUrl(url, pattern)).toBe(true)
  })

  it('should match with host wildcard', () => {
    const url = 'http://subdomain.example.com/path'
    const pattern = 'http://*.example.com/path'
    expect(matchUrl(url, pattern)).toBe(true)
  })

  it('should match with path wildcard', () => {
    const url = 'https://www.example.com/some/path'
    const pattern = 'https://www.example.com/*'
    expect(matchUrl(url, pattern)).toBe(true)
  })

  it('should match with scheme wildcard', () => {
    const url = 'https://www.example.com'
    const pattern = '*://www.example.com'
    expect(matchUrl(url, pattern)).toBe(true)
  })

  it('should not match when domain differs', () => {
    const url = 'http://www.otherdomain.com/'
    const pattern = 'http://www.example.com/'
    expect(matchUrl(url, pattern)).toBe(false)
  })

  it('should not match when path differs', () => {
    const url = 'http://www.example.com/different/path'
    const pattern = 'http://www.example.com/some/path'
    expect(matchUrl(url, pattern)).toBe(false)
  })

  it('should not match when scheme differs', () => {
    const url = 'https://www.example.com'
    const pattern = 'http://www.example.com'
    expect(matchUrl(url, pattern)).toBe(false)
  })

  it('should return false for invalid pattern', () => {
    const url = 'https://www.example.com'
    const pattern = 'invalid-pattern'
    expect(matchUrl(url, pattern)).toBe(false)
  })
})
