import { env } from 'cloudflare:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { policyRouter } from './policy/router'

describe('Policy Router', () => {
  beforeAll(async () => {
    // Apply migrations manually for testing
    // We need to apply ALL migrations in order
    const drizzleDir = path.join(__dirname, '../../../../../drizzle')
    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const migrationSql = fs.readFileSync(path.join(drizzleDir, file), 'utf-8')
      // Split by statement if needed, or simple exec if supported.
      // D1 exec supports multiple statements usually.
      await env.DB.exec(migrationSql)
    }
  })

  it('should upload a config', async () => {
    const res = await policyRouter.request(
      '/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Policy',
          config: { xpath: '//div' },
          domains: ['example.com'],
          tags: ['test'],
        }),
      },
      {
        DB: env.DB,
      } as any
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('configId')
  })

  it('should find config by domain', async () => {
    // Create one first
    await policyRouter.request(
      '/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Google Policy',
          config: { foo: 'bar' },
          domains: ['google.com'],
          tags: ['search'],
        }),
      },
      { DB: env.DB } as any
    )

    const res = await policyRouter.request(
      '/domain?url=https://google.com/search',
      {
        method: 'GET',
      },
      { DB: env.DB } as any
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0].name).toBe('Google Policy')
  })
})
