import { z } from 'zod'

export const BACKUP_FORMAT_VERSION = 1

const serviceBackupDataSchema = z.object({
  version: z.number(),
  data: z.unknown(),
})

export const backupDataSchema = z.object({
  meta: z.object({
    version: z.number(),
    timestamp: z.number(),
    extensionVersion: z.string().optional(),
  }),
  services: z.record(z.string(), serviceBackupDataSchema),
})

export type ParsedBackupData = z.infer<typeof backupDataSchema>
