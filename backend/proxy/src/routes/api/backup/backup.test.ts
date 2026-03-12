import { beforeEach, describe, expect, it } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'
import { env } from 'cloudflare:test'
import { getOrCreateDb } from '@/db'
import { userBackups } from '@/db/schema/backup'
import { factory } from '@/factory'
import { createTestUrl } from '@/test-utils/createTestUrl'
import { backupRouter } from './router'

const IncomingRequest = Request

describe('Backup API', () => {
  // We need to inject the mock auth user before the router
  const createAppWithUser = (userId: string | null) => {
    const app = factory.createApp()
    app.use('*', async (c, next) => {
      if (userId) {
        c.set('authUser', {
          id: userId,
          name: 'Test',
          email: 'test@example.com',
        })
      } else {
        c.set('authUser', null)
      }
      return next()
    })
    app.route('/backup', backupRouter)
    return app
  }

  beforeEach(async () => {
    // Clear out D1 and R2 for fresh state
    const db = getOrCreateDb(env.DB)
    await db.delete(userBackups)

    const listed = await env.FILES_BUCKET.list()
    for (const object of listed.objects) {
      await env.FILES_BUCKET.delete(object.key)
    }
  })

  it('rejects unauthenticated requests', async () => {
    const app = createAppWithUser(null)
    const request = new IncomingRequest(createTestUrl('/backup'), {
      method: 'GET',
    })

    const response = await makeUnitTestRequest(request, { app })
    expect(response.status).toBe(401)
  })

  it('allows user to create a backup', async () => {
    const app = createAppWithUser('user1')

    const mockBackupPayload = {
      meta: { version: 1, timestamp: Date.now() },
      services: {},
    }

    const request = new IncomingRequest(createTestUrl('/backup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: mockBackupPayload }),
    })

    const response = await makeUnitTestRequest(request, { app })
    expect(response.status).toBe(200)

    const data: any = await response.json()
    expect(data.success).toBe(true)
    expect(data.id).toBeDefined()
  })

  it('lists only own backups', async () => {
    const appUser1 = createAppWithUser('user1')
    const appUser2 = createAppWithUser('user2')

    const mockBackupPayload = {
      meta: { version: 1, timestamp: Date.now() },
      services: {},
    }

    // User 1 creates 2 backups
    for (let i = 0; i < 2; i++) {
      await makeUnitTestRequest(
        new IncomingRequest(createTestUrl('/backup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: mockBackupPayload }),
        }),
        { app: appUser1 }
      )
    }

    // User 2 creates 1 backup
    await makeUnitTestRequest(
      new IncomingRequest(createTestUrl('/backup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: mockBackupPayload }),
      }),
      { app: appUser2 }
    )

    // User 1 should only see 2
    const res1 = await makeUnitTestRequest(
      new IncomingRequest(createTestUrl('/backup'), { method: 'GET' }),
      { app: appUser1 }
    )
    const body1: any = await res1.json()
    expect(body1.backups.length).toBe(2)
    // they should belong to user1
    expect(body1.backups.every((b: any) => b.userId === 'user1')).toBe(true)

    // User 2 should only see 1
    const res2 = await makeUnitTestRequest(
      new IncomingRequest(createTestUrl('/backup'), { method: 'GET' }),
      { app: appUser2 }
    )
    const body2: any = await res2.json()
    expect(body2.backups.length).toBe(1)
    expect(body2.backups[0].userId).toBe('user2')
  })

  it("prevents user from getting another user's backup", async () => {
    const appUser1 = createAppWithUser('user1')
    const appUser2 = createAppWithUser('user2')

    const mockBackupPayload = {
      meta: { version: 1, timestamp: Date.now() },
      services: {},
    }

    // User 1 creates a backup
    const createRes = await makeUnitTestRequest(
      new IncomingRequest(createTestUrl('/backup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: mockBackupPayload }),
      }),
      { app: appUser1 }
    )
    const createData: any = await createRes.json()
    const backupId = createData.id

    // User 2 attempts to fetch user 1's backup
    const getRes = await makeUnitTestRequest(
      new IncomingRequest(createTestUrl(`/backup/${backupId}`), {
        method: 'GET',
      }),
      { app: appUser2 }
    )

    // Should be not found because the route doesn't belong to them
    expect(getRes.status).toBe(404)
  })

  it('keeps only the 3 most recent backups per user', async () => {
    const app = createAppWithUser('user3')

    const mockBackupPayload = {
      meta: { version: 1, timestamp: Date.now() },
      services: {},
    }

    const postReq = () =>
      new IncomingRequest(createTestUrl('/backup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: mockBackupPayload }),
      })

    // Create 4 backups
    for (let i = 0; i < 4; i++) {
      await makeUnitTestRequest(postReq(), { app })
    }

    const res = await makeUnitTestRequest(
      new IncomingRequest(createTestUrl('/backup'), { method: 'GET' }),
      { app }
    )
    const body: any = await res.json()

    // Should have pruned down to latest 3
    expect(body.backups.length).toBe(3)
  })
})
