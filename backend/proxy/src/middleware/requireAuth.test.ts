import { describe, expect, it } from 'vitest'
import { factory } from '@/factory'
import { requireAuth } from '@/middleware/requireAuth'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('requireAuth', () => {
  it('returns 401 when user is missing', async () => {
    const app = factory.createApp()
    app.use('*', async (context, next) => {
      context.set('authUser', null)
      return next()
    })
    app.get('/protected', requireAuth(), (context) =>
      context.json({ ok: true })
    )

    const response = await makeUnitTestRequest(
      new Request('http://example.com/protected'),
      { app }
    )

    expect(response.status).toBe(401)
  })

  it('allows request when user exists', async () => {
    const app = factory.createApp()
    app.use('*', async (context, next) => {
      context.set('authUser', { id: 'user-1' })
      return next()
    })
    app.get('/protected', requireAuth(), (context) =>
      context.json({ ok: true })
    )

    const response = await makeUnitTestRequest(
      new Request('http://example.com/protected'),
      { app }
    )

    expect(response.status).toBe(200)
  })
})
