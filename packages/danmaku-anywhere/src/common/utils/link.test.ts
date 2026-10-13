import { describe, expect, it } from 'vitest'
import { isHttpLink, withUrlScheme } from './link'

describe('withUrlScheme', () => {
  it('adds https to a link pasted without a scheme', () => {
    expect(withUrlScheme(' www.bilibili.com/x ')).toBe(
      'https://www.bilibili.com/x'
    )
  })

  it('keeps an existing http or https scheme', () => {
    expect(withUrlScheme('http://localhost:8080/a')).toBe(
      'http://localhost:8080/a'
    )
  })
})

describe('isHttpLink', () => {
  it.each([
    'https://v.qq.com/x/cover/abc.html',
    'http://localhost:8080/play/1',
  ])('accepts %s', (text) => {
    expect(isHttpLink(text)).toBe(true)
  })

  it.each([
    'frieren',
    'www.bilibili.com/bangumi',
    'ftp://example.com/file',
  ])('rejects %s', (text) => {
    expect(isHttpLink(text)).toBe(false)
  })
})
