import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { userAuthDescriptor } from '@/common/options/optionStores'
import { defaultUserAuthState, type UserAuthState } from './schema'
import { LATEST_USER_AUTH_VERSION } from './version'

@injectable('Singleton')
export class UserAuthStore implements IStoreService {
  public readonly name = 'userAuth'
  public readonly descriptor = userAuthDescriptor
  public readonly shouldBackup = false
  public readonly options: OptionsService<UserAuthState>
  private cachedState = defaultUserAuthState

  constructor(
    @inject(LoggerSymbol) private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<UserAuthState>(
      userAuthDescriptor,
      defaultUserAuthState,
      this.logger
    ).version(LATEST_USER_AUTH_VERSION, {
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

  private initialize() {
    this.options.onChange((data) => {
      this.cachedState = data ?? defaultUserAuthState
    })
  }
}
