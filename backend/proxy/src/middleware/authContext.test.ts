import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/auth/types'
import { resolveAuthSession } from '@/middleware/authContext'

describe('authContext', () => {
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
