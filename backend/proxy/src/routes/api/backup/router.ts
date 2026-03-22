import { zValidator } from '@hono/zod-validator'
import { describeRoute, resolver } from 'hono-openapi'
import { z } from 'zod'
import { getOrCreateDb } from '@/db'
import { factory } from '@/factory'
import { requireAuth } from '@/middleware/requireAuth'
import { BackupService } from './service'

export const backupRouter = factory.createApp()

backupRouter.use(requireAuth())

const cloudBackupItemSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  extensionVersion: z.string().nullable(),
})

const listBackupsResponseSchema = z.object({
  backups: z.array(cloudBackupItemSchema),
})

const serviceBackupDataSchema = z.object({
  version: z.number(),
  data: z.unknown(),
})

const backupDataSchema = z.object({
  meta: z.object({
    version: z.number(),
    timestamp: z.number(),
  }),
  services: z.record(z.string(), serviceBackupDataSchema),
})

const getBackupResponseSchema = z.object({
  data: backupDataSchema,
})

const createBackupResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
})

const uploadSchema = z.object({
  data: backupDataSchema,
  extensionVersion: z.string().optional(),
})

backupRouter.get(
  '/',
  describeRoute({
    description: 'List user backups',
    responses: {
      200: {
        description: 'Successful list',
        content: {
          'application/json': {
            schema: resolver(listBackupsResponseSchema),
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
    },
  }),
  async (c) => {
    const user = c.get('authUser')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const db = getOrCreateDb(c.env.DB)
    const backupService = new BackupService(db, c.env.FILES_BUCKET)

    const backups = await backupService.listBackups(user.id)
    return c.json({ backups })
  }
)

backupRouter.get(
  '/:id',
  describeRoute({
    description: 'Get user backup data',
    responses: {
      200: {
        description: 'Successful retrieval',
        content: {
          'application/json': {
            schema: resolver(getBackupResponseSchema),
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      404: {
        description: 'Not found',
      },
    },
  }),
  async (c) => {
    const user = c.get('authUser')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const db = getOrCreateDb(c.env.DB)
    const backupService = new BackupService(db, c.env.FILES_BUCKET)
    const id = c.req.param('id')

    const data = await backupService.getBackup(user.id, id)
    if (!data) {
      return c.json({ error: 'Not found' }, 404)
    }

    return c.json({ data })
  }
)

backupRouter.post(
  '/',
  describeRoute({
    description: 'Create user backup',
    responses: {
      201: {
        description: 'Successfully created backup',
        content: {
          'application/json': {
            schema: resolver(createBackupResponseSchema),
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
    },
  }),
  zValidator('json', uploadSchema),
  async (c) => {
    const user = c.get('authUser')
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const db = getOrCreateDb(c.env.DB)
    const backupService = new BackupService(db, c.env.FILES_BUCKET)
    const { data, extensionVersion } = c.req.valid('json')

    const id = await backupService.createBackup(user.id, data, extensionVersion)
    return c.json({ success: true, id }, 201)
  }
)
