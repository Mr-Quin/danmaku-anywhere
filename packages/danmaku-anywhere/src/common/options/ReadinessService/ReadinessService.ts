import { inject, injectable } from 'inversify'
import { EXTENSION_VERSION } from '@/common/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { tryCatch } from '@/common/utils/tryCatch'

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

    void this.init()
  }

  async waitUntilReady() {
    return this.readyPromise
  }

  setReady() {
    if (!this.isReady) {
      this.isReady = true
      this.resolveReady()
    }
  }

  setVersion(version: string) {
    return this.storage.set({ lastVersion: version })
  }

  private async init() {
    // wait until version is set to the updated version
    const [result, err] = await tryCatch(() => this.storage.read())

    if (err) {
      this.logger.error('Failed to read last version', err)
      return
    }

    const lastVersion = result?.lastVersion
    const currentVersion = EXTENSION_VERSION

    if (lastVersion === currentVersion) {
      this.logger.debug('Version match, ready immediately')
      this.setReady()
      return
    }

    this.logger.debug(
      `Version mismatch (last: ${lastVersion}, current: ${currentVersion}), waiting for upgrade`
    )

    const listener = (version: LastVersion | undefined) => {
      if (!version) {
        return
      }
      if (version.lastVersion === currentVersion) {
        this.logger.debug('Version updated, ready now')
        this.setReady()
        this.storage.unsubscribe(listener)
      }
    }

    this.storage.subscribe(listener)
  }
}
