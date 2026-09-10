export type BackendImpl = 'real' | 'fake'

export interface AppEnvironment {
  name: string
  production: boolean
  apiRoot: string
  clarityProjectId: string
  backendImpl: BackendImpl
}

// Fail closed to 'real' so a missing or typo'd flag never silently swaps in
// the in-memory fake backend in a shipped build.
export function resolveBackendImpl(env: AppEnvironment): BackendImpl {
  return env.backendImpl === 'fake' ? 'fake' : 'real'
}
