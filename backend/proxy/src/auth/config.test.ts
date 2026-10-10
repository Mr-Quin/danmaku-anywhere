import { env } from 'cloudflare:test'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { describe, expect, it } from 'vitest'
import { parseTrustedOrigins } from '@/auth/trustedOrigins'
import { getOrCreateDb } from '@/db'

const BASE_URL = 'https://api.test.example'
const RAW_TRUSTED_ORIGINS = 'https://a.example,https://b.example'

function createTestAuth(trustedOrigins: string[]) {
  return betterAuth({
    baseURL: BASE_URL,
    basePath: '/auth',
    secret: 'test-secret',
    database: drizzleAdapter(getOrCreateDb(env.DB), { provider: 'sqlite' }),
    trustedOrigins,
    advanced: {
      disableOriginCheck: false,
    },
  })
}

function signOutRequest(origin: string) {
  return new Request(`${BASE_URL}/auth/sign-out`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: 'better-auth.session_token=whatever',
    },
  })
}

describe('trustedOrigins wired into betterAuth', () => {
  it('rejects a cookie-bearing request from a listed origin when the list is passed unparsed', async () => {
    const auth = createTestAuth([RAW_TRUSTED_ORIGINS])

    const response = await auth.handler(signOutRequest('https://b.example'))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.message).toBe('Invalid origin')
  })

  it('accepts a cookie-bearing request from a listed origin when the list is parsed', async () => {
    const auth = createTestAuth(parseTrustedOrigins(RAW_TRUSTED_ORIGINS))

    const response = await auth.handler(signOutRequest('https://b.example'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
