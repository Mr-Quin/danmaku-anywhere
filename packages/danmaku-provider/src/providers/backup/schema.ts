import { z } from 'zod'

export const zCloudBackupItem = z.object({
  id: z.string(),
  createdAt: z.number(),
  extensionVersion: z.string().nullable(),
})

export type CloudBackupItem = z.infer<typeof zCloudBackupItem>

export const zListBackupsResponse = z.object({
  backups: z.array(zCloudBackupItem),
})

export type ListBackupsResponse = z.infer<typeof zListBackupsResponse>

export const zCreateBackupResponse = z.object({
  success: z.boolean(),
  id: z.string(),
})

export type CreateBackupResponse = z.infer<typeof zCreateBackupResponse>

export const zDownloadBackupResponse = z.object({
  data: z.unknown(),
})

export type DownloadBackupResponse = z.infer<typeof zDownloadBackupResponse>
