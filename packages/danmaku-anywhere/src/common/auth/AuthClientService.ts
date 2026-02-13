import { inject, injectable } from 'inversify'
import { createAuthClientInstance } from '@/common/auth/createAuthClient'
import type {
  AuthActionResult,
  AuthSessionState,
  AuthSignInInput,
  AuthSignOutResult,
  AuthSignUpInput,
} from '@/common/auth/types'
import { UserAuthStore } from '@/common/options/userAuth/service'

type AuthClient = ReturnType<typeof createAuthClientInstance>

@injectable('Singleton')
export class AuthClientService {
  private client: AuthClient | null = null

  constructor(@inject(UserAuthStore) private userAuthStore: UserAuthStore) {}

  async signUp(input: AuthSignUpInput): Promise<AuthActionResult> {
    const client = await this.getClient()

    switch (input.provider) {
      case 'email': {
        const { error, data } = await client.signUp.email({
          email: input.email,
          password: input.password,
          name: input.name,
          image: input.image,
        })
        if (error) {
          return { state: 'error', message: error.statusText }
        }

        await this.userAuthStore.setUser(data.user)

        return {
          state: 'success',
          user: data.user,
        }
      }
    }
  }

  async signIn(input: AuthSignInInput): Promise<AuthActionResult> {
    const client = await this.getClient()

    switch (input.provider) {
      case 'email': {
        const { data, error } = await client.signIn.email({
          email: input.email,
          password: input.password,
        })

        if (error) {
          return { state: 'error', message: error.statusText }
        }

        await this.userAuthStore.setUser(data.user)

        return {
          state: 'success',
          user: data.user,
        }
      }
      case 'google': {
        const res = await client.signIn.social({
          provider: 'google',
        })

        if (res.error) {
          return { state: 'error', message: res.error.statusText }
        }

        throw new Error('Not implemented')
      }
    }
  }

  async signOut(): Promise<AuthSignOutResult> {
    const client = await this.getClient()

    try {
      const { error } = await client.signOut()

      if (error) {
        return { state: 'error', message: error.statusText }
      }

      return { state: 'success' }
    } finally {
      await this.userAuthStore.clearSession()
    }
  }

  async getSessionState(): Promise<AuthSessionState | null> {
    const client = await this.getClient()
    const { data, error } = await client.getSession()

    if (error || !data) {
      return null
    }

    await this.userAuthStore.setUser(data.user)

    return data
  }

  async deleteAccount(): Promise<AuthSignOutResult> {
    const client = await this.getClient()

    try {
      const { error } = await client.deleteUser()

      if (error) {
        return { state: 'error', message: error.statusText }
      }

      return { state: 'success' }
    } finally {
      await this.userAuthStore.clearSession()
    }
  }

  private async getClient() {
    if (!this.client) {
      await this.userAuthStore.ensureReady()
      this.client = createAuthClientInstance(this.userAuthStore)
    }
    return this.client
  }
}
