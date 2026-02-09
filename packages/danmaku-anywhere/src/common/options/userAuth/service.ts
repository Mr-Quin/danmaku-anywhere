import { injectable } from 'inversify'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { defaultUserAuthState, type UserAuthState } from './schema'

const userAuthStorageKey = 'userAuth'

@injectable('Singleton')
export class UserAuthService {
  private storage = new ExtStorageService<UserAuthState>(userAuthStorageKey, {
    storageType: 'local',
  })
  private cachedState = defaultUserAuthState
  private readyPromise: Promise<void>

  constructor() {
    this.storage.setup()
    this.storage.subscribe((value) => {
      this.cachedState = value ?? defaultUserAuthState
    })
    this.readyPromise = this.load()
  }

  async ensureReady() {
    await this.readyPromise
  }

  async getToken() {
    await this.ensureReady()
    return this.cachedState.token
  }

  getTokenSync() {
    return this.cachedState.token ?? ''
  }

  async setToken(token: string | null) {
    this.cachedState = { token }
    await this.storage.set(this.cachedState)
  }

  async clearToken() {
    await this.setToken(null)
  }

  private async load() {
    const stored = await this.storage.read()
    this.cachedState = stored ?? defaultUserAuthState
  }
}
