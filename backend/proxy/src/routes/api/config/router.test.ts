import { describe, expect, it } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('Config router', () => {
  it('GET /api/config/maccms returns baseUrls', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/config/maccms')
    )
    expect(res.status).toBe(200)
    const json: any = await res.json()
    expect(json.baseUrls.length).toBeGreaterThan(0)
  })

  it('GET /api/config/danmuicu returns baseUrls', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/config/danmuicu')
    )
    expect(res.status).toBe(200)
    const json: any = await res.json()
    expect(json.baseUrls.length).toBeGreaterThan(0)
  })

  it('sets Cache-Control for config endpoints', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/config/maccms')
    )
    expect(res.headers.get('Cache-Control')).toBe('max-age=86400')
  })
})
