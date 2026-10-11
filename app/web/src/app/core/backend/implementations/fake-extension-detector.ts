import { computed, Injectable, signal } from '@angular/core'
import { LATEST_EXTENSION_VERSION } from '../../extension/latestExtensionVersion'
import { ExtensionDetector } from '../extension-detector'

@Injectable()
export class FakeExtensionDetector extends ExtensionDetector {
  readonly $isLoading = signal(false).asReadonly()
  readonly $id = signal<string | null>('fake-ext-id').asReadonly()
  readonly $installedVersion = signal<string | null>(
    LATEST_EXTENSION_VERSION
  ).asReadonly()
  readonly $isExtensionInstalled = computed(() => true)
  readonly $isOutdated = computed(() => false)
  readonly latestVersion = LATEST_EXTENSION_VERSION

  init(): Promise<unknown> {
    return Promise.resolve(undefined)
  }
}
