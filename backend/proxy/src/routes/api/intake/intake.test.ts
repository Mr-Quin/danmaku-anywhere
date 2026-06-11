import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'
import { createRateLimiterMock } from '@/test-utils/createMockRateLimiter'
import { MAX_BATCH_LENGTH, MAX_EVENT_BYTES } from './schema'

const IncomingRequest = Request

const INTAKE_URL = 'http://example.com/v1/intake'

const validEvent = (overrides: Record<string, unknown> = {}) => {
  return {
    installId: 'install-1',
    event: 'heartbeat',
    properties: { browser: 'chrome' },
    clientTs: 1700000000000,
    version: '1.0.0',
    environment: 'prod',
    surface: 'background',
    ...overrides,
  }
}

const postBatch = (body: unknown) => {
  return makeUnitTestRequest(
    new IncomingRequest(INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('intake API', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    env.INTAKE_RATE_LIMITER = createRateLimiterMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a valid batch and forwards enriched events to Axiom', async () => {
    const response = await postBatch([validEvent()])

    expect(response.status).toBe(202)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(env.AXIOM_INTAKE_URL)
    expect(init.headers.Authorization).toBe('Bearer axiom-token')

    const forwarded = JSON.parse(init.body)
    expect(forwarded).toHaveLength(1)
    expect(forwarded[0]).toMatchObject({
      installId: 'install-1',
      event: 'heartbeat',
      country: null,
      serverEnvironment: env.ENVIRONMENT,
    })
    expect(typeof forwarded[0].receivedAt).toBe('string')
  })

  it('forwards unknown event names without rejecting them', async () => {
    const response = await postBatch([
      validEvent({ event: 'someBrandNewEvent', properties: { foo: 'bar' } }),
    ])

    expect(response.status).toBe(202)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects a malformed envelope', async () => {
    const response = await postBatch([validEvent({ surface: 'spaceship' })])

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects an empty batch', async () => {
    const response = await postBatch([])

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a batch over the length cap', async () => {
    const batch = Array.from({ length: MAX_BATCH_LENGTH + 1 }, () =>
      validEvent()
    )

    const response = await postBatch(batch)

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects an event whose properties exceed the per-item cap', async () => {
    const big = 'x'.repeat(MAX_EVENT_BYTES + 1)
    const response = await postBatch([validEvent({ properties: { big } })])

    expect(response.status).toBe(413)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('measures the per-item cap in bytes, not UTF-16 code units', async () => {
    // Each CJK char is 1 code unit but 3 UTF-8 bytes; this stays under the cap
    // by length yet exceeds it by bytes.
    const cjk = '危'.repeat(MAX_EVENT_BYTES - 100)
    const response = await postBatch([validEvent({ properties: { cjk } })])

    expect(response.status).toBe(413)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects when the rate limit is exceeded', async () => {
    env.INTAKE_RATE_LIMITER = createRateLimiterMock({ success: false })

    const response = await postBatch([validEvent()])

    expect(response.status).toBe(429)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('responds 202 even when the Axiom forward fails', async () => {
    fetchSpy.mockRejectedValue(new Error('network down'))

    const response = await postBatch([validEvent()])

    expect(response.status).toBe(202)
  })
})
