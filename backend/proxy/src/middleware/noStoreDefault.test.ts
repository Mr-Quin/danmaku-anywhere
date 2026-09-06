import { describe, expect, it } from 'vitest'
import { factory } from '@/factory'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import { noStoreDefault } from './noStoreDefault'

describe('noStoreDefault', () => {
  const createTestApp = () => {
    const app = factory.createApp()
    app.use('*', noStoreDefault())
    app.get('/bare', (c) => c.json({ ok: true }))
    app.get('/cached', (c) => {
      c.header('Cache-Control', 'max-age=60')
      return c.json({ ok: true })
    })
    app.get(
      '/upstream',
      () =>
        new Response('{}', {
          headers: { 'Content-Type': 'application/json' },
        })
    )
    return app
  }

  it('sets no-store on a response that carries no Cache-Control', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/bare'),
      { app: createTestApp() }
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('leaves an explicit Cache-Control untouched', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/cached'),
      { app: createTestApp() }
    )

    expect(res.headers.get('Cache-Control')).toBe('max-age=60')
  })

  it('covers a handler that returns a raw Response', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/upstream'),
      { app: createTestApp() }
    )

    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('covers the not-found response', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/missing'),
      { app: createTestApp() }
    )

    expect(res.status).toBe(404)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('applies to the real worker: an unknown path is not-found and no-store', async () => {
    const res = await makeUnitTestRequest(
      new Request('http://example.com/definitely-not-a-route')
    )

    expect(res.status).toBe(404)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
