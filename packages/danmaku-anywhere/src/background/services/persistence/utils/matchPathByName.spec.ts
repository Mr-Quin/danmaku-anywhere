import { describe, expect, it } from 'vitest'
import { matchPathByName } from './matchPathByName'

describe('matchPathByName', () => {
  it('should match exact names', () => {
    expect(matchPathByName('foo', 'foo')).toBe(true)
    expect(matchPathByName('foo.txt', 'foo.txt')).toBe(true)
  })

  it('should match ignoring extensions', () => {
    expect(matchPathByName('foo', 'foo.txt')).toBe(true)
    expect(matchPathByName('foo.txt', 'foo')).toBe(true)
    expect(matchPathByName('foo.jpg', 'foo.png')).toBe(true)
  })

  it('should match with directory paths', () => {
    expect(matchPathByName('foo', 'path/to/foo')).toBe(true)
    expect(matchPathByName('foo', 'path/to/foo.txt')).toBe(true)
    expect(matchPathByName('foo.txt', 'path/to/foo')).toBe(true)
    expect(matchPathByName('foo.jpg', 'path/to/foo.png')).toBe(true)
  })

  it('should not match different names', () => {
    expect(matchPathByName('foo', 'bar')).toBe(false)
    expect(matchPathByName('foo', 'path/to/bar')).toBe(false)
    expect(matchPathByName('foo.txt', 'bar.txt')).toBe(false)
  })

  it('should handle edge cases', () => {
    expect(matchPathByName('foo', '')).toBe(false)
    expect(matchPathByName('foo', 'path/to/')).toBe(false)
  })
})
