import { describe, expect, it } from 'vitest'
import { resolveDnrTemplate } from './dnrTemplate'

describe('resolveDnrTemplate', () => {
  it('should resolve simple template', () => {
    const template = {
      Referer: 'https://example.com?q={query}',
    }
    const context = {
      query: 'test',
    }
    const result = resolveDnrTemplate(template, context)
    expect(result).toEqual({
      Referer: 'https://example.com?q=test',
    })
  })

  it('should resolve multiple headers with different variables', () => {
    const template = {
      Referer: 'https://example.com?id={id}',
      Origin: 'https://{subdomain}.example.com',
    }
    const context = {
      id: 123,
      subdomain: 'api',
    }
    const result = resolveDnrTemplate(template, context)
    expect(result).toEqual({
      Referer: 'https://example.com?id=123',
      Origin: 'https://api.example.com',
    })
  })

  it('should handle missing variables with empty string', () => {
    const template = {
      Referer: 'https://example.com?q={query}',
    }
    const context = {}
    const result = resolveDnrTemplate(template, context)
    expect(result).toEqual({
      Referer: 'https://example.com?q=',
    })
  })

  it('should handle numeric and boolean variables', () => {
    const template = {
      'X-Count': '{count}',
      'X-Flag': '{flag}',
    }
    const context = {
      count: 42,
      flag: true,
    }
    const result = resolveDnrTemplate(template, context)
    expect(result).toEqual({
      'X-Count': '42',
      'X-Flag': 'true',
    })
  })

  it('should ignore extra variables in context', () => {
    const template = {
      'X-Value': '{value}',
    }
    const context = {
      value: 'foo',
      extra: 'bar',
    }
    const result = resolveDnrTemplate(template, context)
    expect(result).toEqual({
      'X-Value': 'foo',
    })
  })
})
