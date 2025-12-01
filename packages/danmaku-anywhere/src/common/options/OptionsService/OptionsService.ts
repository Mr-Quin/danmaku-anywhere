import { Logger } from '../../Logger'
import type { ExtStorageType } from '../../storage/ExtStorageService'
import { ExtStorageService } from '../../storage/ExtStorageService'
import { readinessService } from '../ReadinessService/ReadinessService'
import { migrateOptions } from './migrationOptions'
import type {
  Options,
  OptionsSchema,
  UpgradeContext,
  Version,
  VersionConfig,
} from './types'

// biome-ignore lint/suspicious/noExplicitAny: used for data migration where the previous options type is lost
export type PrevOptions = any

type QueuedOperation<T> = {
  operation: () => Promise<T>
  promise: {
    resolve: (value: T) => void
    reject: (reason?: unknown) => void
  }
}

//Handles creating and upgrading options schema
export class OptionsService<T extends OptionsSchema> {
  private versions: Version[] = []
  private readonly logger: typeof Logger
  private storageService: ExtStorageService<Options<T>>
  private operationQueue: QueuedOperation<unknown>[] = []
  private isProcessingQueue = false

  constructor(
    readonly key: string,
    private defaultOptions: T,
    storageType: ExtStorageType = 'sync'
  ) {
    this.storageService = new ExtStorageService<Options<T>>(key, {
      storageType,
    })
    this.logger = Logger.sub('[OptionsService]').sub(`[${key}]`)
    this.setup()
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

  // upgrade options to latest version
  async upgrade(context: UpgradeContext = {}): Promise<void> {
    if (this.versions.length === 0) {
      throw new Error('Cannot upgrade without any versions')
    }

    const options = await this.storageService.read()

    this.logger.debug('Init')

    if (!options) {
      // if no options, set default options as the latest version
      this.logger.debug('No existing options found, using default options')

      return await this.reset()
    }

    this.logger.debug(`Found options with version '${options.version}'`)
    // if options is not versioned, assume version 0 for purpose of upgrading
    options.version ??= 0
    const upgradedOptions = migrateOptions(
      options,
      this.versions,
      this.logger,
      context
    )
    await this.storageService.set(upgradedOptions)
  }

  async get(): Promise<T> {
    await readinessService.waitUntilReady()
    const options = await this.storageService.read()
    if (!options) return this.defaultOptions
    return options.data
  }

  async set(data: T, version?: number) {
    await readinessService.waitUntilReady()
    return this.#queueOperation(async () => {
      let currentVersion = version
      if (!currentVersion) {
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
    await readinessService.waitUntilReady()
    return this.#queueOperation(async () => {
      const options = await this.get()
      const mergedData = { ...options, ...data }
      return this.#setInternal(mergedData)
    })
  }

  // reset options to default
  async reset() {
    await readinessService.waitUntilReady()
    return this.#queueOperation(async () => {
      return this.storageService.set({
        data: this.defaultOptions,
        version: this.#getLatestVersion().version,
      })
    })
  }

  onChange(listener: (data: T) => void) {
    this.storageService.subscribe((options) => {
      if (!options) return
      listener(options.data)
    })
  }

  setup() {
    this.storageService.setup()
  }

  destroy() {
    this.storageService.destroy()
    // Clear the queue and reject any pending operations
    this.operationQueue.forEach((operation) => {
      operation.promise.reject(new Error('OptionsService was destroyed'))
    })
    this.operationQueue = []
  }

  // Used by UpgradeService to read data without waiting for ready
  async readInternal() {
    return this.storageService.read()
  }

  // Internal set method that doesn't queue (used within queued operations)
  async #setInternal(data: T, version?: number) {
    let currentVersion = version
    if (!currentVersion) {
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

  #queueOperation<R>(operation: () => Promise<R>): Promise<R> {
    const { promise, resolve, reject } = Promise.withResolvers<R>()

    this.operationQueue.push({
      operation,
      promise: { resolve: resolve as (value: unknown) => void, reject },
    })

    void this.#processQueue()

    return promise
  }

  async #processQueue() {
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

  #getLatestVersion() {
    return this.versions.reduce((acc, v) => {
      if (acc.version < v.version) {
        return v
      }
      return acc
    })
  }
}
