import { Logger } from '../../Logger'
import type { ExtStorageType } from '../../storage/ExtStorageService'
import { ExtStorageService } from '../../storage/ExtStorageService'

import { migrateOptions } from './migrationOptions'
import type { Options, OptionsSchema, Version, VersionConfig } from './types'

export type PrevOptions = any

//Handles creating and upgrading options schema
export class OptionsService<T extends OptionsSchema> {
  private versions: Version<T>[] = []
  private readonly logger: typeof Logger
  private storageService: ExtStorageService<Options<T>>

  constructor(
    private key: string,
    private defaultOptions: T,
    storageType: ExtStorageType = 'sync'
  ) {
    this.storageService = new ExtStorageService<Options<T>>(key, {
      storageType,
    })
    this.logger = Logger.sub('[OptionsService]').sub(`[${key}]`)
    this.setup()
  }

  version(version: number, versionConfig: VersionConfig<T>) {
    if (version <= 0) {
      throw new Error(`Version must be larger than 0`)
    }
    if (this.versions.some((v) => v.version >= version)) {
      throw new Error(`New version must be bigger than existing ones`)
    }

    // keep versions sorted
    this.versions.push({ ...versionConfig, version })
    return this
  }

  // upgrade options to latest version
  async upgrade(): Promise<void> {
    if (this.versions.length === 0) {
      throw new Error('Cannot upgrade without any versions')
    }

    const options = await this.storageService.read()

    this.logger.debug('Init')

    if (!options) {
      // if no options, set default options as the latest version
      this.logger.debug(`No existing options found, using default options`)

      return await this.reset()
    }

    this.logger.debug(`Found options with version '${options.version}'`)
    // if options is not versioned, assume version 0 for purpose of upgrading
    options.version ??= 0
    const upgradedOptions = migrateOptions(options, this.versions, this.logger)
    await this.storageService.set(upgradedOptions)
  }

  async get(): Promise<T> {
    const options = await this.storageService.read()
    if (!options) return this.defaultOptions
    return options.data
  }

  async set(data: T, version?: number) {
    if (!version) {
      const options = await this.storageService.read()
      if (!options) {
        throw new Error('Cannot set options without existing options')
      }
      version = options.version
    }
    return this.storageService.set({
      data,
      version,
    })
  }

  // allow partial update
  async update(data: Partial<T>) {
    const options = await this.get()
    return this.set({ ...options, ...data })
  }

  // reset options to default
  async reset() {
    return this.storageService.set({
      data: this.defaultOptions,
      version: this.#getLatestVersion().version,
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
