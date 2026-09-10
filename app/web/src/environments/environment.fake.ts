import type { AppEnvironment } from './environment.interface'

// Drives the hermetic demo serve and the e2e build: an in-memory backend,
// no extension, no network. apiRoot is never hit in this mode.
export const environment: AppEnvironment = {
  name: 'fake',
  production: false,
  apiRoot: 'http://localhost/api',
  clarityProjectId: '',
  backendImpl: 'fake',
}
