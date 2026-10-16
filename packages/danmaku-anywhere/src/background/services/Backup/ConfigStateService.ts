import { inject, injectable, multiInject, optional } from 'inversify'
import { prettifyError, type ZodType, z } from 'zod'
import type {
  BackupData,
  BackupRestoreResult,
  DroppedEntry,
} from '@/common/backup/dto'
import {
  BACKUP_FORMAT_VERSION,
  backupDataSchema,
  type ParsedBackupData,
} from '@/common/backup/schema'
import { AppError } from '@/common/errors/AppError'
import { errorMessage } from '@/common/errors/errorMessage'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { storageProblemOf } from '@/common/options/OptionsService/storageProblem'
import { decodeEnvelope } from '@/common/options/OptionsService/storeLayout'
import type {
  DeferredWrite,
  StoreSnapshot,
} from '@/common/options/OptionsService/types'
import {
  type IRestoreListCheck,
  RestoreListCheckSymbol,
} from '@/common/options/RestoreListCheck'

type ServiceBackup = ParsedBackupData['services'][string]

// The file the upgrade screen downloads before it resets a store
// (OptionsRecoveryCopy). It holds the store's envelope, or its raw items when
// they did not add up to one.
const recoveryCopySchema = z.object({
  id: z.string(),
  store: z.string(),
  savedAt: z.number(),
  envelope: z.unknown().optional(),
  items: z.record(z.string(), z.unknown()).optional(),
})

const envelopeSchema = z.object({ version: z.number(), data: z.unknown() })

type PayloadCheck =
  | {
      ok: true
      data: unknown
      dropped: DroppedEntry[]
      deferred: DeferredWrite[]
    }
  | { ok: false; error: string }

type EntriesCheck =
  | { ok: true; data: unknown[]; dropped: DroppedEntry[] }
  | { ok: false; error: string }

function stringField(entry: unknown, key: string): string | undefined {
  if (typeof entry !== 'object' || entry === null || !(key in entry)) {
    return undefined
  }
  const value: unknown = Reflect.get(entry, key)
  return typeof value === 'string' && value !== '' ? value : undefined
}

function isOlderVersion(version: string, than: string): boolean {
  const a = version.split('.').map(Number)
  const b = than.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) {
      return diff < 0
    }
  }
  return false
}

function droppedEntry(
  entry: unknown,
  reason: DroppedEntry['reason'],
  detail: string
): DroppedEntry {
  return {
    id: stringField(entry, 'id'),
    label: stringField(entry, 'name') ?? stringField(entry, 'customName'),
    reason,
    detail,
  }
}

@injectable('Singleton')
export class ConfigStateService {
  private logger: ILogger

  constructor(
    @multiInject(StoreServiceSymbol)
    private services: IStoreService[],
    @inject(LoggerSymbol) logger: ILogger,
    @multiInject(RestoreListCheckSymbol)
    @optional()
    private listChecks: IRestoreListCheck[] = []
  ) {
    this.logger = logger.sub('[ConfigStateService]')
  }

  async getState(): Promise<BackupData> {
    const services = await Promise.all(
      this.services
        .filter((service) => service.shouldBackup !== false)
        .map(async (service) => {
          const [data, version] = await Promise.all([
            service.options.get(),
            service.options.getVersion(),
          ])
          return {
            name: service.name,
            data: {
              data,
              version,
            },
          }
        })
    )

    return {
      meta: {
        version: BACKUP_FORMAT_VERSION,
        timestamp: Date.now(),
        extensionVersion: chrome.runtime.getManifest().version,
      },
      services: services.reduce(
        (acc, { name, data }) => {
          acc[name] = data
          return acc
        },
        {} as BackupData['services']
      ),
    }
  }

  async restoreState(file: unknown): Promise<BackupRestoreResult> {
    const fromRecovery = recoveryCopySchema.safeParse(file)
    const backup = fromRecovery.success
      ? this.backupFromRecoveryCopy(fromRecovery.data)
      : file
    const parsed = backupDataSchema.safeParse(backup)

    if (!parsed.success) {
      throw new AppError(
        'backup.invalidFormat',
        {},
        { message: `Invalid backup format: ${prettifyError(parsed.error)}` }
      )
    }

    const { meta, services } = parsed.data

    if (meta.version !== BACKUP_FORMAT_VERSION) {
      throw new AppError(
        'backup.unsupportedVersion',
        {},
        {
          message: `Unsupported backup version ${meta.version}, this extension can only restore version ${BACKUP_FORMAT_VERSION} backups`,
        }
      )
    }

    const result: BackupRestoreResult = {
      success: true,
      details: {},
    }

    const candidates = this.services
      .filter((service) => service.shouldBackup !== false)
      .map((service) => {
        return { service, backupData: services[service.name] }
      })
    const present = candidates.flatMap(({ service, backupData }) => {
      return backupData === undefined ? [] : [{ service, backupData }]
    })

    const stores: StoreSnapshot = Object.fromEntries(
      await Promise.all(
        this.services.map(async (service) => {
          const restored = services[service.name]
          if (restored && service.shouldBackup !== false) {
            return [service.options.key, restored.data]
          }
          return [service.options.key, await service.options.readUnblocked()]
        })
      )
    )

    const validated = await Promise.all(
      present.map(async ({ service, backupData }) => {
        const check = await this.checkPayload(service, backupData, stores)
        if (!check.ok) {
          this.logger.error(
            `Rejected backup data for ${service.name}`,
            check.error
          )
          result.success = false
          result.details[service.name] = { success: false, error: check.error }
        }
        return { service, check }
      })
    )

    // A store the backup carries itself takes its own payload, not what
    // another store's migration derived for it.
    const restoredStores = new Set(
      validated
        .filter(({ check }) => check.ok)
        .map(({ service }) => service.options.key)
    )
    const derivedStores = new Set<string>()
    const accepted: {
      service: IStoreService
      data: unknown
      dropped: DroppedEntry[]
    }[] = []
    for (const { service, check } of validated) {
      if (!check.ok) {
        continue
      }
      try {
        for (const write of check.deferred) {
          if (!restoredStores.has(write.store)) {
            await write.run()
            derivedStores.add(write.store)
          }
        }
        accepted.push({
          service,
          data: check.data,
          dropped: check.dropped,
        })
      } catch (error) {
        this.logger.error(`Failed to restore ${service.name}`, error)
        result.success = false
        result.details[service.name] = {
          success: false,
          error: errorMessage(error),
          code: storageProblemOf(error),
        }
      }
    }

    await Promise.all(
      accepted.map(async ({ service, data, dropped }) => {
        const { name } = service
        try {
          this.logger.debug(`Restoring ${name}...`)
          await service.options.set(data, service.options.latestVersion)
          result.details[name] =
            dropped.length > 0
              ? { success: true, droppedEntries: dropped.length, dropped }
              : { success: true, droppedEntries: 0 }
          if (dropped.length > 0) {
            this.logger.warn(`Dropped restored ${name} entries`, dropped)
            result.success = false
          }
        } catch (error) {
          this.logger.error(`Failed to restore ${name}`, error)
          result.success = false
          result.details[name] = {
            success: false,
            error: errorMessage(error),
            code: storageProblemOf(error),
          }
        }
      })
    )

    // A store an older backup did not carry may have been derived from one
    // it did, such as the sources a v1.5.0 backup kept in its settings.
    const missing = candidates
      .filter(({ service, backupData }) => {
        if (
          backupData !== undefined ||
          derivedStores.has(service.options.key)
        ) {
          return false
        }
        if (service.backupSince === undefined) {
          return true
        }
        // Backups made before 1.6.0 do not record the release that made them.
        const { extensionVersion } = meta
        return (
          extensionVersion !== undefined &&
          !isOlderVersion(extensionVersion, service.backupSince)
        )
      })
      .map(({ service }) => service.name)
    // A recovery file holds one store on purpose.
    if (missing.length > 0 && !fromRecovery.success) {
      result.missing = missing
    }

    return result
  }

  // A recovery copy restores as a backup holding only its store, so it goes
  // through the same migrations and checks as a backup's section would.
  private backupFromRecoveryCopy(
    copy: z.infer<typeof recoveryCopySchema>
  ): BackupData {
    const service = this.services.find((candidate) => {
      return candidate.options.key === copy.store
    })
    const unrestorable = new AppError(
      'backup.recoveryUnrestorable',
      { store: copy.store },
      { message: `The recovery copy of ${copy.store} cannot be restored` }
    )
    if (!service || service.shouldBackup === false) {
      throw unrestorable
    }
    let envelope: unknown = copy.envelope
    if (copy.items !== undefined) {
      try {
        envelope = decodeEnvelope(service.descriptor, copy.items)
      } catch {
        throw unrestorable
      }
    }
    const parsed = envelopeSchema.safeParse(envelope)
    if (!parsed.success) {
      throw unrestorable
    }
    return {
      meta: { version: BACKUP_FORMAT_VERSION, timestamp: copy.savedAt },
      services: { [service.name]: parsed.data },
    }
  }

  private async checkPayload(
    service: IStoreService,
    backupData: ServiceBackup,
    stores: StoreSnapshot
  ): Promise<PayloadCheck> {
    const { latestVersion } = service.options
    const { backupItemSchema, backupSchema } = service

    if (backupData.version > latestVersion) {
      return {
        ok: false,
        error: `Backup holds version ${backupData.version} of this store, which is newer than the supported version ${latestVersion}`,
      }
    }

    // Some list migrations turn a non-list into an empty list, which would
    // quietly wipe the store, so the shape is checked before migrating.
    if (backupItemSchema && !Array.isArray(backupData.data)) {
      return { ok: false, error: 'Expected a list of entries' }
    }

    const deferred: DeferredWrite[] = []
    let migrated: unknown
    try {
      migrated = service.options.migrate(backupData.data, backupData.version, {
        stores,
        defer: (write) => deferred.push(write),
      })
    } catch (error) {
      return {
        ok: false,
        error: `Could not migrate the restored data: ${errorMessage(error)}`,
      }
    }

    if (backupItemSchema) {
      const entries = await this.checkEntries(
        service,
        backupItemSchema,
        backupData.data,
        migrated
      )
      if (!entries.ok) {
        return entries
      }
      return { ...entries, deferred }
    }

    if (!backupSchema) {
      return { ok: true, data: migrated, dropped: [], deferred }
    }

    const parsed = await backupSchema.safeParseAsync(migrated)

    if (!parsed.success) {
      return { ok: false, error: prettifyError(parsed.error) }
    }

    return { ok: true, data: parsed.data, dropped: [], deferred }
  }

  private async checkEntries(
    service: IStoreService,
    itemSchema: ZodType,
    original: unknown,
    migrated: unknown
  ): Promise<EntriesCheck> {
    if (!Array.isArray(original) || !Array.isArray(migrated)) {
      return { ok: false, error: 'Expected a list of entries' }
    }

    const passed: unknown[] = []
    const dropped: DroppedEntry[] = []
    for (const entry of migrated) {
      const parsed = await itemSchema.safeParseAsync(entry)
      if (parsed.success) {
        passed.push(parsed.data)
      } else {
        dropped.push(
          droppedEntry(entry, 'invalidEntry', prettifyError(parsed.error))
        )
      }
    }

    let kept = passed
    for (const check of this.listChecks) {
      if (check.store !== service.name) {
        continue
      }
      const refusals = await check.check(kept)
      kept.forEach((entry, index) => {
        const refusal = refusals[index]
        if (refusal !== undefined) {
          dropped.push(droppedEntry(entry, refusal.reason, refusal.detail))
        }
      })
      kept = kept.filter((_, index) => refusals[index] === undefined)
    }

    // Writing an empty list would wipe the store, so a payload where nothing
    // survives migration and validation is a failure rather than an empty
    // restore.
    if (original.length > 0 && kept.length === 0) {
      return {
        ok: false,
        error: `All ${original.length} entries failed validation`,
      }
    }

    const lost = original.length - migrated.length
    for (let i = 0; i < lost; i++) {
      dropped.push({ reason: 'notMigrated', detail: 'Could not be migrated' })
    }
    return { ok: true, data: kept, dropped }
  }
}
