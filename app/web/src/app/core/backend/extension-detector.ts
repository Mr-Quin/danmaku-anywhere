import type { Signal } from '@angular/core'

export abstract class ExtensionDetector {
  abstract readonly $isLoading: Signal<boolean>
  abstract readonly $id: Signal<string | null>
  abstract readonly $installedVersion: Signal<string | null>
  abstract readonly $isExtensionInstalled: Signal<boolean>
  abstract readonly $isOutdated: Signal<boolean>
  abstract readonly latestVersion: string

  abstract init(): Promise<unknown>
}
