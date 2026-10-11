import { inject, injectable } from 'inversify'
import { EXTENSION_VERSION } from '@/common/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'

interface LastVersion {
  lastVersion: string
}

@injectable('Singleton')
export class ReadinessService {
  private isReady = false
  private readonly readyPromise: Promise<void>
  private readonly resolveReady: () => void
  private logger: ILogger
  private storage = new ExtStorageService<LastVersion>('lastVersion', {
    storageType: 'local',
  })

  constructor(@inject(LoggerSymbol) logger: ILogger) {
    const { promise, resolve } = Promise.withResolvers<void>()
    this.readyPromise = promise
    this.resolveReady = resolve

    this.logger = logger.sub('[ReadinessService]')

    this.init().catch((err) => {
      this.logger.error('Failed to read last version', err)
    })
  }

  async waitUntilReady() {
    return this.readyPromise
  }

  setReady() {
    if (!this.isReady) {
      this.isReady = true
      this.storage.destroy()
      this.resolveReady()
    }
  }

  async isCurrentVersion(): Promise<boolean> {
    const result = await this.storage.read()
    return result?.lastVersion === EXTENSION_VERSION
  }

  setVersion(version: string): Promise<void> {
    return this.storage.set({ lastVersion: version })
  }

  private async init() {
    const currentVersion = EXTENSION_VERSION

    // Subscribe before reading, or a version write landing between the two is
    // never seen.
    this.storage.subscribe((version) => {
      if (version?.lastVersion === currentVersion) {
        this.logger.debug('Version updated, ready now')
        this.setReady()
      }
    })
    this.storage.setup()

    const result = await this.storage.read()
    const lastVersion = result?.lastVersion

    if (lastVersion === currentVersion) {
      this.logger.debug('Version match, ready immediately')
      this.setReady()
      return
    }

    this.logger.debug(
      `Version mismatch (last: ${lastVersion}, current: ${currentVersion}), waiting for upgrade`
    )
  }
}
