import { computed, Injectable, inject, signal } from '@angular/core'
import { getExtensionAttr } from '@danmaku-anywhere/web-scraper'
import { ClarityService } from '../clarity.service'
import { compareVersion } from './compareVersion'
import { LATEST_EXTENSION_VERSION } from './latestExtensionVersion'

@Injectable({
  providedIn: 'root',
})
export class ExtensionService {
  private clarityService = inject(ClarityService)

  private readonly $_extensionVersion = signal<string | null>(null)
  private readonly $_isLoading = signal(true)

  readonly $isLoading = this.$_isLoading.asReadonly()
  readonly $installedVersion = this.$_extensionVersion.asReadonly()
  readonly $isExtensionInstalled = computed(() => {
    return this.$_extensionVersion() !== null
  })
  readonly $isOutdated = computed(() => {
    const version = this.$_extensionVersion()
    if (version) {
      if (compareVersion(version, LATEST_EXTENSION_VERSION) === -1) {
        return true
      }
    }
    return false
  })
  readonly latestVersion = LATEST_EXTENSION_VERSION

  async init() {
    const { promise, resolve } = Promise.withResolvers()
    // sometimes the extension script initializes late, so we poll for a small duration
    const interval = setInterval(() => {
      const { version, id } = getExtensionAttr()

      if (id) {
        this.clarityService.identify(id)
      }

      if (version) {
        this.clarityService.track('extensionVersion', version)
      }

      if (version) {
        console.log('Extension version:', version)
        this.$_extensionVersion.set(version)
        this.$_isLoading.set(false)
        clearInterval(interval)
        clearTimeout(timeout)
        resolve(undefined)
      }
    }, 100)

    const timeout = setTimeout(() => {
      this.$_isLoading.set(false)
      clearInterval(interval)
      clearTimeout(timeout)
      resolve(undefined)
    }, 1000)

    return promise
  }
}
