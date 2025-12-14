import { injectable } from 'inversify'
import { Logger } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'

interface LastVersion {
  lastVersion: string
}

@injectable('Singleton')
export class ReadinessService {
  private isReady = false
  private readonly readyPromise: Promise<void>
  private readonly resolveReady: () => void
  private logger = Logger.sub('[ReadinessService]')
  private storage = new ExtStorageService<LastVersion>('lastVersion', {
    storageType: 'local',
  })

  constructor() {
    const { promise, resolve } = Promise.withResolvers<void>()
    this.readyPromise = promise
    this.resolveReady = resolve

    this.init()
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

  private init() {
    // wait until version is set to the updated version
    this.storage.read().then((result) => {
      const lastVersion = result?.lastVersion
      const currentVersion = chrome.runtime.getManifest().version

      if (lastVersion === currentVersion) {
        this.logger.debug('Version match, ready immediately')
        this.setReady()
      } else {
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
    })
  }
}
