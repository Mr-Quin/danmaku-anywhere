import { describe, expect, it } from 'vitest'
import { isLink, withUrlScheme } from './link'

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

describe('isLink', () => {
  it.each([
    'https://v.qq.com/x/cover/abc.html',
    'http://localhost:8080/play/1',
    'www.bilibili.com/bangumi/media/md1',
    'v.qq.com/x/cover/abc.html',
  ])('accepts %s', (text) => {
    expect(isLink(text)).toBe(true)
  })

  it.each([
    '',
    'frieren',
    'Dr.STONE',
    'sousou no frieren.mkv',
    'localhost/play/1',
    'ftp://example.com/file',
  ])('rejects %s', (text) => {
    expect(isLink(text)).toBe(false)
  })
})
