import { desc, eq, inArray } from 'drizzle-orm'
import type { Database } from '@/db'
import { userBackups } from '@/db/schema/backup'

const MAX_REVISIONS = 3

export class BackupService {
  constructor(
    private db: Database,
    private filesBucket: R2Bucket
  ) {}

  async listBackups(userId: string) {
    const backups = await this.db.query.userBackups.findMany({
      columns: { id: true, createdAt: true, extensionVersion: true },
      where: eq(userBackups.userId, userId),
      orderBy: [desc(userBackups.createdAt)],
    })
    return backups.map((b) => ({
      ...b,
      createdAt: b.createdAt.getTime(),
    }))
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

  async createBackup(userId: string, data: unknown, extensionVersion?: string) {
    // Write the new backup first so we don't lose old ones if this fails.
    const backupId = crypto.randomUUID()
    const fileKey = `${backupId}.json`
    const objectPath = `backups/${userId}/${fileKey}`
    await this.filesBucket.put(objectPath, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    })
    await this.db.insert(userBackups).values({
      id: backupId,
      userId: userId,
      fileKey,
      extensionVersion: extensionVersion ?? null,
    })

    // Prune oldest backups to stay within the revision limit.
    // D1 does not support interactive transactions, so there is a
    // theoretical race if the same user creates backups concurrently.
    const existingBackups = await this.db.query.userBackups.findMany({
      where: eq(userBackups.userId, userId),
      orderBy: [desc(userBackups.createdAt)],
    })

    if (existingBackups.length > MAX_REVISIONS) {
      const backupsToPrune = existingBackups.slice(MAX_REVISIONS)
      const fileKeys = backupsToPrune.map(
        (b) => `backups/${userId}/${b.fileKey}`
      )
      const ids = backupsToPrune.map((b) => b.id)

      await this.filesBucket.delete(fileKeys)
      await this.db.delete(userBackups).where(inArray(userBackups.id, ids))
    }

    return backupId
  }
}
