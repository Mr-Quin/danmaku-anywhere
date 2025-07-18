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

  it('handles CORS preflight request', async () => {
    const request = new Request('http://example.com/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
      },
    })
    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      (env as any).ALLOWED_ORIGIN
    )
  })
})
