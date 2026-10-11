import type { ILogger } from '@/common/Logger'
import type { ExtStorageType } from '@/common/storage/getStorageArea'
import { ExtStorageService } from '../../storage/ExtStorageService'
import type { ReadinessService } from '../ReadinessService/ReadinessService'
import { migrateOptions } from './migrationOptions'
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
  private storageService: ExtStorageService<Options<T>>
  private operationQueue: QueuedOperation<unknown>[] = []
  private isProcessingQueue = false

  constructor(
    private readinessService: ReadinessService,
    readonly key: string,
    private defaultOptions: T,
    logger: ILogger,
    storageType: ExtStorageType = 'sync'
  ) {
    this.storageService = new ExtStorageService<Options<T>>(key, {
      storageType,
    })
    this.logger = logger.sub('[OptionsService]').sub(`[${key}]`)
    this.setup()
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

  // Data that cannot be migrated is replaced with defaults. A storage error is
  // not bad data: it propagates and the stored value stays as it was. Writes
  // deferred by the steps land before this store is persisted, so if one fails
  // the old data is still here for the next attempt to migrate again.
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
      this.logger.error('Failed to upgrade options, reset to default', error)
      await this.reset()
      return
    }

    for (const write of deferred) {
      await write()
    }
    await this.queueOperation(() => this.storageService.set(upgraded))
  }

  // Unlike upgrade(), a failing step throws instead of resetting the store to
  // defaults.
  migrate(data: PrevOptions, version: number, context: UpgradeContext): T {
    return migrateOptions<T>(
      { data, version },
      this.versions,
      this.logger,
      context
    ).data
  }

  // Replaces the data at the latest version without waiting for readiness,
  // for writes made while the stores are being upgraded or restored.
  setUnblocked(data: T): Promise<void> {
    return this.queueOperation(() =>
      this.storageService.set({ data, version: this.latestVersion })
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
      return this.storageService.set({
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

  onChange(listener: (data: T) => void) {
    this.storageService.subscribe((options) => {
      if (!options) return
      listener(options.data)
    })
  }

  destroy() {
    this.storageService.destroy()
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

  private setup() {
    this.storageService.setup()
  }

  // reset options to default, not blocked
  private async reset() {
    return this.queueOperation(async () => {
      return this.storageService.set({
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
    return this.storageService.set({
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
