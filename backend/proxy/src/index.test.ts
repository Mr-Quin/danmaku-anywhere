import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('Basic functionality', () => {
  it('returns 404 for root path', async () => {
    const request = new Request('http://example.com/')
    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(404)
  })

  it('sets X-Powered-By header', async () => {
    const request = new Request('http://example.com/')
    const response = await makeUnitTestRequest(request)
    expect(response.headers.get('X-Powered-By')).toBe('DanmakuAnywhere')
  })

  it('handles CORS request', async () => {
    env.ALLOWED_ORIGIN = 'https://example.com'

    const request = new Request('http://example.com/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
      },
    })
    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://example.com'
    )
  })

  it('handles multiple allowed origins', async () => {
    env.ALLOWED_ORIGIN = 'https://example.com,https://example2.com'

    // should return the first allowed origin
    const request = new Request('http://example.com/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
      },
    })
    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://example.com'
    )

    // should return the second allowed origin
    const request2 = new Request('http://example.com/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example2.com',
      },
    })
    const response2 = await makeUnitTestRequest(request2)
    expect(response2.status).toBe(204)
    expect(response2.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://example2.com'
    )

    // no origin header, should return the first allowed origin
    const request3 = new Request('http://example.com/', {
      method: 'OPTIONS',
    })
    const response3 = await makeUnitTestRequest(request3)
    expect(response3.status).toBe(204)
    expect(response3.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://example.com'
    )

    // origin not in allowed list, should return the first allowed origin
    const request4 = new Request('http://example.com/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://invalid.com',
      },
    })
    const response4 = await makeUnitTestRequest(request4)
    expect(response4.status).toBe(204)
    expect(response4.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://example.com'
    )
  })
})
