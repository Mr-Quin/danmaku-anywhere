import type { Provider } from '@angular/core'
import { environment } from '../../../environments/environment'
import { resolveBackendImpl } from '../../../environments/environment.interface'
import { ExtensionService } from '../extension/extension.service'
import { ExtensionMessagingService } from '../extension/extension-messaging.service'
import { ExtensionDetector } from './extension-detector'
import { ExtensionMessenger } from './extension-messenger'
import {
  FakeBackendRecorder,
  FakeBackendRecorderImpl,
  NoopFakeBackendRecorder,
} from './fake-backend-recorder'
import { fakeBangumiProviders } from './implementations/fake-bangumi-clients'
import { FakeExtensionDetector } from './implementations/fake-extension-detector'
import { FakeExtensionMessenger } from './implementations/fake-extension-messenger'
import { realBangumiProviders } from './implementations/real-bangumi-clients'

const realProviders: Provider[] = [
  { provide: ExtensionDetector, useClass: ExtensionService },
  { provide: ExtensionMessenger, useClass: ExtensionMessagingService },
  { provide: FakeBackendRecorder, useClass: NoopFakeBackendRecorder },
  ...realBangumiProviders,
]

const fakeProviders: Provider[] = [
  { provide: ExtensionDetector, useClass: FakeExtensionDetector },
  { provide: ExtensionMessenger, useClass: FakeExtensionMessenger },
  { provide: FakeBackendRecorder, useClass: FakeBackendRecorderImpl },
  ...fakeBangumiProviders,
]

export const backendProviders: Provider[] =
  resolveBackendImpl(environment) === 'fake' ? fakeProviders : realProviders
