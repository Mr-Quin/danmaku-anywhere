import { ExtStorageService } from './ExtStorageService'
import { Logger } from './Logger'

type OptionsSchema = Record<string, any>

export type Options<T> = {
  data: T
  version: number
}

type Version<T> = {
  version: number
  upgrade: (prevSchema: unknown) => T // previous shema's type is unknown
}

type VersionConfig<T> = Omit<Version<T>, 'version'>

//Handles creating and upgrading options schema
export class SyncOptionsService<T extends OptionsSchema> {
  private versions: Version<T>[] = []
  private logger: typeof Logger
  private storageService: ExtStorageService<Options<T>>

  constructor(private key: string, private defaultOptions: T) {
    this.storageService = new ExtStorageService<Options<T>>(key, {
      storageType: 'sync',
    })
    this.logger = Logger.sub('[SyncOptionsService]').sub(`[${key}]`)
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
      // if no options, set default options as first version
      this.logger.debug(
        `No existing options found, upgrading using default options`
      )

      const firstOptions = {
        data: this.defaultOptions,
        version: 0, // version is guaranteed to > 0
      }

      // recursively upgrade to latest version
      const upgradedOptions = this.#migrate(firstOptions)
      await this.storageService.set(upgradedOptions)

      return
    }

    // if options is not versioned, set version to 0
    options.version ??= 0
    this.logger.debug(`Found options with version ${options.version}`)
    const upgradedOptions = this.#migrate(options)
    await this.storageService.set(upgradedOptions)
  }

  #migrate(options: Options<T>): Options<T> {
    const nextVersion = this.#getNextVersion(options.version)

    // if no next migration, return data as is
    if (!nextVersion) {
      this.logger.debug(`At latest version ${options.version}`)
      return options as Options<T>
    }

    this.logger.debug(
      `Upgrading from version ${options.version} to ${nextVersion.version}`
    )

    // recursively upgrade data until no next migration
    const upgradedData = {
      data: nextVersion.upgrade(options.data),
      version: nextVersion.version, // increment version
    }
    return this.#migrate(upgradedData)
  }

  #getNextVersion(version: number): Version<T> | undefined {
    // get all versions bigger than current version
    const biggerVersions = this.versions.filter((v) => v.version > version)

    if (biggerVersions.length === 0) {
      return undefined
    }

    // return the smallest version of the bigger versions
    return biggerVersions.reduce((acc, v) => {
      if (acc.version > v.version) {
        return v
      }
      return acc
    })
  }

  #getLatestVersion() {
    return this.versions.reduce((acc, v) => {
      if (acc.version < v.version) {
        return v
      }
      return acc
    })
  }

  async get(): Promise<T> {
    const options = await this.storageService.read()
    if (!options) return this.defaultOptions
    return options.data
  }

  // update options and keep version
  // assumes data is already at latest version
  async update(data: T) {
    return this.storageService.set({
      data,
      version: this.#getLatestVersion().version,
    })
  }

  // reset options to default
  async reset() {
    return this.storageService.set({
      data: this.defaultOptions,
      version: this.#getLatestVersion().version,
    })
  }

  onChange(listener: (data: T | undefined) => void) {
    this.storageService.subscribe((options) => {
      // data is undefined when storage is cleared, which should not happen
      if (!options) return
      listener(options.data)
    })
  }

  destroy() {
    this.storageService.destroy()
  }
}
