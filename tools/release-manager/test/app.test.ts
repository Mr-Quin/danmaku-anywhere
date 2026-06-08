import { err, ok, type Result } from '@danmaku-anywhere/result'
import { describe, expect, it } from 'vitest'
import type { ReleaseManager } from '../src/core/manager.js'
import type { PublicState, ReleaseManagerError } from '../src/core/types.js'
import { createApp } from '../src/server/app.js'

const emptyState: PublicState = {
  hasToken: false,
  dataDir: '/tmp/data',
  builds: [],
}

function fakeManager(overrides: Partial<ReleaseManager> = {}): ReleaseManager {
  const base = {
    getState: async () => emptyState,
    listReleases: async () => ok([]),
    downloadBuild: async () => ok(emptyState),
    setActive: async () => ok(emptyState),
    removeBuild: async () => ok(emptyState),
    updateToken: async () => emptyState,
    reconcile: async () => undefined,
  }
  return { ...base, ...overrides } as unknown as ReleaseManager
}

const localHeaders = {
  Host: '127.0.0.1:4317',
  'Content-Type': 'application/json',
}

describe('createApp host allowlist', () => {
  it('allows a loopback host', async () => {
    const app = createApp(fakeManager())
    const res = await app.request('/api/state', {
      headers: { Host: 'localhost:4317' },
    })
    expect(res.status).toBe(200)
  })

  it('rejects a foreign host with 403', async () => {
    const app = createApp(fakeManager())
    const res = await app.request('/api/state', {
      headers: { Host: 'evil.example.com' },
    })
    expect(res.status).toBe(403)
  })
})

describe('createApp statusFor mapping', () => {
  const cases: Array<{ error: ReleaseManagerError; status: number }> = [
    { error: { kind: 'auth', status: 401, message: 'x' }, status: 401 },
    { error: { kind: 'auth', status: 403, message: 'x' }, status: 403 },
    { error: { kind: 'rate-limited', message: 'x' }, status: 429 },
    { error: { kind: 'conflict', message: 'x' }, status: 409 },
    { error: { kind: 'not-found', message: 'x' }, status: 404 },
    { error: { kind: 'invalid', message: 'x' }, status: 400 },
    { error: { kind: 'network', message: 'x' }, status: 502 },
    { error: { kind: 'swap', message: 'x' }, status: 500 },
  ]

  for (const { error, status } of cases) {
    it(`maps ${error.kind} to ${status}`, async () => {
      const app = createApp(
        fakeManager({
          downloadBuild: async (): Promise<
            Result<PublicState, ReleaseManagerError>
          > => err(error),
        })
      )
      const res = await app.request('/api/builds/download', {
        method: 'POST',
        headers: localHeaders,
        body: JSON.stringify({ tag: 'v1' }),
      })
      expect(res.status).toBe(status)
    })
  }
})

describe('createApp requireTag', () => {
  const routes = ['/api/active', '/api/builds/download']

  for (const route of routes) {
    it(`rejects an empty tag with 400 on POST ${route}`, async () => {
      const app = createApp(fakeManager())
      const res = await app.request(route, {
        method: 'POST',
        headers: localHeaders,
        body: JSON.stringify({ tag: '' }),
      })
      expect(res.status).toBe(400)
    })

    it(`rejects a whitespace tag with 400 on POST ${route}`, async () => {
      const app = createApp(fakeManager())
      const res = await app.request(route, {
        method: 'POST',
        headers: localHeaders,
        body: JSON.stringify({ tag: '   ' }),
      })
      expect(res.status).toBe(400)
    })

    it(`rejects a missing body with 400 on POST ${route}`, async () => {
      const app = createApp(fakeManager())
      const res = await app.request(route, {
        method: 'POST',
        headers: localHeaders,
      })
      expect(res.status).toBe(400)
    })
  }
})
