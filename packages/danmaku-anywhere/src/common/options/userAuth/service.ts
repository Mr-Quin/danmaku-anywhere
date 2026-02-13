import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { defaultUserAuthState, type UserAuthState } from './schema'

@injectable('Singleton')
export class UserAuthStore implements IStoreService {
  public readonly name = 'userAuth'
  public readonly options: OptionsService<UserAuthState>
  private cachedState = defaultUserAuthState

  constructor(
    @inject(LoggerSymbol) private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<UserAuthState>(
      'userAuth',
      defaultUserAuthState,
      this.logger,
      'local'
    ).version(1, {
      upgrade: (data) => data,
    })

    this.initialize()
  }

  async ensureReady() {
    const data = await this.options.get()
    this.cachedState = data ?? defaultUserAuthState
  }

  async getToken() {
    const state = await this.options.get()
    return state?.token
  }

  async getUser() {
    const state = await this.options.get()
    return state?.user
  }

  getTokenSync() {
    return this.cachedState?.token ?? ''
  }

  async setUser(user: UserAuthState['user']) {
    this.cachedState = { ...this.cachedState, user }
    await this.options.update({ user })
  }

  async setToken(token: string | null) {
    this.cachedState = { ...this.cachedState, token }
    await this.options.update({ token })
  }

  async clearSession() {
    this.cachedState = { ...defaultUserAuthState }
    await this.options.update(defaultUserAuthState)
  }

  // initialize cache and subscribe to changes
  private initialize() {
    this.options.onChange((data) => {
      this.cachedState = data ?? defaultUserAuthState
    })

    void this.options.get().then((data) => {
      this.cachedState = data ?? defaultUserAuthState
    })
  }
}
