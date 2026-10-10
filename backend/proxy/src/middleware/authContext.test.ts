import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/auth/types'
import { hasAuthCredential, resolveAuthSession } from '@/middleware/authContext'

describe('resolveAuthSession', () => {
  it('returns null user and session when missing', async () => {
    const result = await resolveAuthSession(new Headers(), async () => null)
    expect(result).toEqual({ user: null, session: null })
  })

  it('returns session payload when present', async () => {
    const fakeSession = {
      user: { id: 'user-1' },
      session: { id: 'session-1' },
    } as AuthSession

    const result = await resolveAuthSession(
      new Headers(),
      async () => fakeSession
    )

    expect(result.user).toBe(fakeSession.user)
    expect(result.session).toBe(fakeSession.session)
  })
})

describe('hasAuthCredential', () => {
  it('is false when the request carries neither a cookie nor an Authorization header', () => {
    expect(hasAuthCredential(new Headers())).toBe(false)
    expect(hasAuthCredential(new Headers({ 'da-extension-id': 'abc' }))).toBe(
      false
    )
  })

  it('is true when a cookie is present', () => {
    expect(
      hasAuthCredential(new Headers({ cookie: 'better-auth.session_token=x' }))
    ).toBe(true)
  })

  it('is true when an Authorization header is present', () => {
    expect(
      hasAuthCredential(new Headers({ authorization: 'Bearer token' }))
    ).toBe(true)
  })
})
