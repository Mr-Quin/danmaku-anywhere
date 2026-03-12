import { desc, eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { userBackups } from '@/db/schema/backup'

const MAX_REVISIONS = 3

export class BackupService {
  constructor(
    private db: Database,
    private filesBucket: R2Bucket
  ) {}

  async listBackups(userId: string) {
    return await this.db.query.userBackups.findMany({
      where: eq(userBackups.userId, userId),
      orderBy: [desc(userBackups.createdAt)],
    })
  }

  async getBackup(userId: string, id: string) {
    const backup = await this.db.query.userBackups.findFirst({
      where: eq(userBackups.id, id),
    })

    if (!backup || backup.userId !== userId) {
      return null
    }

    const obj = await this.filesBucket.get(
      `backups/${userId}/${backup.fileKey}`
    )

    if (!obj) {
      return null
    }

    return await obj.json()
  }

  async createBackup(userId: string, data: any) {
    const existingBackups = await this.db.query.userBackups.findMany({
      where: eq(userBackups.userId, userId),
      orderBy: [desc(userBackups.createdAt)],
    })

    if (existingBackups.length >= MAX_REVISIONS) {
      const oldestBackups = existingBackups.slice(MAX_REVISIONS - 1)
      for (const ob of oldestBackups) {
        await this.filesBucket.delete(`backups/${userId}/${ob.fileKey}`)
        await this.db.delete(userBackups).where(eq(userBackups.id, ob.id))
      }
    }

    const fileKey = `${Date.now()}.json`
    const objectPath = `backups/${userId}/${fileKey}`
    await this.filesBucket.put(objectPath, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    })

    const backupId = crypto.randomUUID()
    await this.db.insert(userBackups).values({
      id: backupId,
      userId: userId,
      fileKey,
    })

    return backupId
  }
}
