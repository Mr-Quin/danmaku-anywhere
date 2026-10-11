import {
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
} from '@angular/core'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { definePreset } from '@primeng/themes'
import Aura from '@primeng/themes/aura'
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental'
import { ConfirmationService, MessageService } from 'primeng/api'
import { providePrimeNG } from 'primeng/config'

import {
  BANGUMI_CLIENT,
  BANGUMI_NEXT_CLIENT,
} from '../../core/backend/bangumi-clients'
import { ExtensionDetector } from '../../core/backend/extension-detector'
import { ExtensionMessenger } from '../../core/backend/extension-messenger'
import {
  FakeBackendRecorder,
  FakeBackendRecorderImpl,
} from '../../core/backend/fake-backend-recorder'
import { fakeBangumiProviders } from '../../core/backend/implementations/fake-bangumi-clients'
import { FakeExtensionDetector } from '../../core/backend/implementations/fake-extension-detector'
import { FakeExtensionMessenger } from '../../core/backend/implementations/fake-extension-messenger'
import { FakeKazumiCatalog } from '../../core/backend/implementations/fake-kazumi-catalog'
import { KazumiCatalog } from '../../core/backend/kazumi-catalog'

// Fresh per spec: no retries and no stale/gc window so a query cache can never
// leak fixture data between tests.
export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  })
}

// Wires the same fake-backend tokens production binds in fake mode, so specs
// exercise the real Angular tree (lane store, components, query layer, theme)
// against an in-memory backend and never touch the network. Bind the abstract
// seam tokens directly rather than going through environment resolution.
export function provideTestApp(
  extra: Array<Provider | EnvironmentProviders> = []
): Array<Provider | EnvironmentProviders> {
  return [
    provideZonelessChangeDetection(),
    provideNoopAnimations(),
    provideQueryClient(testQueryClient()),
    providePrimeNG({
      theme: {
        preset: definePreset(Aura, {}),
        options: { darkModeSelector: '.da-dark' },
      },
    }),
    MessageService,
    ConfirmationService,
    { provide: ExtensionDetector, useClass: FakeExtensionDetector },
    { provide: ExtensionMessenger, useClass: FakeExtensionMessenger },
    { provide: FakeBackendRecorder, useClass: FakeBackendRecorderImpl },
    { provide: KazumiCatalog, useClass: FakeKazumiCatalog },
    ...fakeBangumiProviders,
    ...extra,
  ]
}

export { BANGUMI_CLIENT, BANGUMI_NEXT_CLIENT }
