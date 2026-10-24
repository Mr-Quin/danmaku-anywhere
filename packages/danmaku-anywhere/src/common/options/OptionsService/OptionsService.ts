import { AppError } from '@/common/errors/AppError'
import type { ILogger } from '@/common/Logger'
import type { ReadinessGate } from '../ReadinessService/ReadinessService'
import { migrateOptions } from './migrationOptions'
import { OptionsStorage, type OptionsStorageLocation } from './OptionsStorage'
import { isStoredAtVersion } from './storedVersion'
import type {
  DeferredWrite,
  Options,
  OptionsSchema,
  PrevOptions,
  StoreSnapshot,
  UpgradeContext,
  Version,
  VersionConfig,
} from './types'

type QueuedOperation<T> = {
  operation: () => Promise<T>
  promise: {
    resolve: (value: T) => void
    reject: (reason?: unknown) => void
  }
}

export class OptionsService<T extends OptionsSchema> {
  private versions: Version[] = []
  private readonly logger: ILogger
  private readonly storageService: OptionsStorage<T>
  private operationQueue: QueuedOperation<unknown>[] = []
  private isProcessingQueue = false

  constructor(
    private readinessService: ReadinessGate,
    location: OptionsStorageLocation,
    private defaultOptions: T,
    logger: ILogger
  ) {
    this.storageService = new OptionsStorage<T>(location)
    this.logger = logger.sub('[OptionsService]').sub(`[${location.key}]`)
  }

  get key(): string {
    return this.storageService.key
  }

  get latestVersion(): number {
    if (this.versions.length === 0) {
      return 0
    }
    return this.getLatestVersion().version
  }

  version(version: number, versionConfig: VersionConfig) {
    if (version <= 0) {
      throw new Error('Version must be larger than 0')
    }
    if (this.versions.some((v) => v.version >= version)) {
      throw new Error('New version must be bigger than existing ones')
    }

    // keep versions sorted
    this.versions.push({ ...versionConfig, version })
    return this
  }

  // Data that cannot be migrated rejects with options.migration and
  // stays as it was, for the user to fix or reset. A storage error propagates
  // the same way. Writes deferred by the steps land before this store is
  // persisted, so if one fails the old data is still here for the next attempt
  // to migrate again.
  async upgrade(stores: StoreSnapshot = {}): Promise<void> {
    if (this.versions.length === 0) {
      throw new Error('Cannot upgrade without any versions')
    }

    const stored = await this.storageService.read()

    if (!stored) {
      this.logger.debug('No existing options found, using default options')
      await this.reset()
      return
    }

    this.logger.debug(`Found options with version '${stored.version}'`)

    // Readiness counts a store at its latest version as done, so rewriting it
    // here could overwrite a change the UI makes once every store is current.
    if (isStoredAtVersion(stored, this.latestVersion)) {
      return
    }

    if (!isOptionsEnvelope(stored)) {
      throw new AppError(
        'options.migration',
        { store: this.key },
        { message: 'The stored value is not an options envelope' }
      )
    }

    const deferred: DeferredWrite[] = []
    let upgraded: Options<T>
    try {
      upgraded = migrateOptions(
        // unversioned options predate versioning, so they start from 0
        { data: stored.data, version: stored.version ?? 0 },
        this.versions,
        this.logger,
        { stores, defer: (write) => deferred.push(write) }
      )
    } catch (error) {
      throw new AppError(
        'options.migration',
        { store: this.key },
        { cause: error }
      )
    }

    for (const write of deferred) {
      await write.run()
    }
    await this.queueOperation(() => this.storageService.write(upgraded))
  }

  migrate(data: PrevOptions, version: number, context: UpgradeContext): T {
    return migrateOptions<T>(
      { data, version },
      this.versions,
      this.logger,
      context
    ).data
  }

  // Writes the defaults at the latest version without waiting for readiness.
  resetUnblocked(): Promise<void> {
    return this.reset()
  }

  readRawUnblocked(): Promise<Record<string, unknown>> {
    return this.storageService.readRaw()
  }

  // Replaces the data at the latest version without waiting for readiness,
  // for writes made while the stores are being upgraded or restored.
  setUnblocked(data: T): Promise<void> {
    return this.queueOperation(() =>
      this.storageService.write({ data, version: this.latestVersion })
    )
  }

  async get(): Promise<T> {
    await this.readinessService.waitUntilReady()

    return this.readUnblocked()
  }

  async getVersion(): Promise<number> {
    await this.readinessService.waitUntilReady()

    const options = await this.storageService.read()
    return options?.version ?? 0
  }

  async set(data: T, version?: number) {
    await this.readinessService.waitUntilReady()

    return this.queueOperation(async () => {
      let currentVersion = version
      if (currentVersion === undefined) {
        const options = await this.storageService.read()
        if (!options) {
          throw new Error('Cannot set options without existing options')
        }
        currentVersion = options.version
      }
      return this.storageService.write({
        data,
        version: currentVersion,
      })
    })
  }

  // allow partial update
  async update(data: Partial<T>) {
    await this.readinessService.waitUntilReady()

    return this.queueOperation(async () => {
      const options = await this.get()
      const mergedData = { ...options, ...data }
      return this.setInternal(mergedData)
    })
  }

  // Reads, changes and writes in one queued step, so no other write from this
  // context lands between the read and the write. Returning the data unchanged
  // skips the write. Data an older build tagged with an older version is left
  // for the next upgrade to migrate rather than changed under the wrong tag.
  async transform(change: (data: T) => T | Promise<T>): Promise<T> {
    await this.readinessService.waitUntilReady()

    return this.queueOperation(async () => {
      const stored = await this.storageService.read()
      if (!stored) {
        throw new Error('Cannot transform options without existing options')
      }
      if (stored.version !== this.latestVersion) {
        // A change written now would keep the older version's tag, and the
        // next upgrade would migrate data that is already in the new shape.
        throw new AppError(
          'options.outdated',
          {
            store: this.key,
            version: stored.version,
            expected: this.latestVersion,
          },
          {
            message: `Cannot change ${this.key} stored at version ${stored.version}, expected ${this.latestVersion}`,
          }
        )
      }
      const next = await change(stored.data)
      if (next !== stored.data) {
        await this.storageService.write({ data: next, version: stored.version })
      }
      return next
    })
  }

  onChange(listener: (data: T) => void) {
    this.storageService.watch((options) => {
      if (!options) {
        return
      }
      listener(options.data)
    })
  }

  destroy() {
    this.storageService.unwatchAll()
    // Clear the queue and reject any pending operations
    this.operationQueue.forEach((operation) => {
      operation.promise.reject(new Error('OptionsService was destroyed'))
    })
    this.operationQueue = []
  }

  // Read without waiting for readiness
  async readUnblocked(): Promise<T> {
    const options = await this.storageService.read()
    if (!options) {
      return this.defaultOptions
    }
    return options.data
  }

  // The stored envelope as is, or undefined when the store was never written
  readStoredUnblocked(): Promise<Options<T> | undefined> {
    return this.storageService.read()
  }

  // reset options to default, not blocked
  private async reset() {
    return this.queueOperation(async () => {
      return this.storageService.write({
        data: this.defaultOptions,
        version: this.getLatestVersion().version,
      })
    })
  }

  // Internal set method that doesn't queue (used within queued operations)
  private async setInternal(data: T, version?: number) {
    let currentVersion = version
    if (currentVersion === undefined) {
      const options = await this.storageService.read()
      if (!options) {
        throw new Error('Cannot set options without existing options')
      }
      currentVersion = options.version
    }
    return this.storageService.write({
      data,
      version: currentVersion,
    })
  }

  private queueOperation<R>(operation: () => Promise<R>): Promise<R> {
    const { promise, resolve, reject } = Promise.withResolvers<R>()

    this.operationQueue.push({
      operation,
      promise: { resolve: resolve as (value: unknown) => void, reject },
    })

    void this.processQueue()

    return promise
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.operationQueue.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: length is checked above
      const queuedOperation = this.operationQueue.shift()!

      try {
        const result = await queuedOperation.operation()
        queuedOperation.promise.resolve(result)
      } catch (error) {
        queuedOperation.promise.reject(error)
      }
    }

    this.isProcessingQueue = false
  }

  private getLatestVersion() {
    return this.versions.reduce((acc, v) => {
      if (acc.version < v.version) {
        return v
      }
      return acc
    })
  }
}

// Unversioned options predate versioning and count as version 0, but any
// version that is there has to be one a step can start from.
function isOptionsEnvelope(stored: unknown): stored is Options<unknown> {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return false
  }
  const version = 'version' in stored ? stored.version : undefined
  return (
    version === undefined || (Number.isInteger(version) && Number(version) >= 0)
  )
}
