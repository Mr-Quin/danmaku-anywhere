import { ExtStorageService } from './ExtStorageService'
import { Logger } from './Logger'

type OptionsSchema = Record<string, any>

type WithVersion<T> = T & { version: number }

type Version<T> = {
  version: number
  upgrade: (prevSchema: unknown) => T // previous shema's type is unknown
}

type VersionConfig<T> = Omit<Version<T>, 'version'>

//Handles creating and upgrading options schema
export class SyncOptionsService<T extends OptionsSchema> {
  private versions: Version<T>[] = []
  private logger: typeof Logger
  private storageService: ExtStorageService<WithVersion<T>>

  constructor(private key: string, private defaultOptions: T) {
    this.storageService = new ExtStorageService<WithVersion<T>>(key, {
      storageType: 'sync',
    })
    this.logger = Logger.sub('[SyncOptionsService]').sub(`[${key}]`)
  }

  version(version: number, versionConfig: VersionConfig<T>) {
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
      // if no options, set default options with latest version
      const latestVersion = this.#getLatestVersion()
      this.logger.debug(
        `No options found, setting default options with version ${latestVersion.version}`
      )
      this.storageService.set({
        ...this.defaultOptions,
        version: latestVersion.version,
      })
      return
    }
    // if options is not versioned, set version to 0
    options.version ??= 0
    this.logger.debug(`Found options with version ${options.version}`)
    const upgradedOptions = this.#migrate(options)
    this.storageService.set(upgradedOptions)
  }

  #migrate(data: WithVersion<T>): WithVersion<T> {
    const nextVersion = this.#getNextVersion(data.version)

    // if no next migration, return data as is
    if (!nextVersion) {
      this.logger.debug(`At latest version ${data.version}`)
      return data as WithVersion<T>
    }

    this.logger.debug(
      `Upgrading from version ${data.version} to ${nextVersion.version}`
    )

    // recursively upgrade data until no next migration
    const upgradedData = {
      ...nextVersion.upgrade(data),
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

  async get() {
    const data = await this.storageService.read()
    if (!data) return this.defaultOptions
    return data
  }

  // update options and keep version
  // assumes data is already at latest version
  async update(data: T) {
    return this.storageService.set({
      ...data,
      version: this.#getLatestVersion().version,
    })
  }

  // reset options to default
  async reset() {
    return this.storageService.set({
      ...this.defaultOptions,
      version: this.#getLatestVersion().version,
    })
  }

  onChange(listener: (data: T | undefined) => void) {
    this.storageService.subscribe((data) => {
      // data is undefined when storage is cleared, which should not happen
      if (!data) return
      listener(data)
    })
  }

  destroy() {
    this.storageService.destroy()
  }
}
