import { inject, injectable } from 'inversify'
import { createAuthClientInstance } from '@/common/auth/createAuthClient'
import type {
  AuthActionResult,
  AuthSessionInfo,
  AuthSessionState,
  AuthSignOutResult,
} from '@/common/auth/types'
import { UserAuthService } from '@/common/options/userAuth/service'

type AuthClient = ReturnType<typeof createAuthClientInstance>

type EmailSignUpInput = {
  email: string
  password: string
  name?: string
}

type EmailSignInInput = {
  email: string
  password: string
}

@injectable('Singleton')
export class AuthClientService {
  private client: AuthClient | null = null

  constructor(
    @inject(UserAuthService) private userAuthService: UserAuthService
  ) {}

  async signUpEmail(input: EmailSignUpInput): Promise<AuthActionResult> {
    const client = await this.getClient()
    const { error } = await client.signUp.email(input)
    if (error) {
      return { state: 'error', message: error.message }
    }
    const sessionState = await this.getSessionState()
    return {
      state: 'success',
      session: sessionState.session,
      token: sessionState.token,
    }
  }

  async signInEmail(input: EmailSignInInput): Promise<AuthActionResult> {
    const client = await this.getClient()
    const { error } = await client.signIn.email(input)
    if (error) {
      return { state: 'error', message: error.message }
    }
    const sessionState = await this.getSessionState()
    return {
      state: 'success',
      session: sessionState.session,
      token: sessionState.token,
    }
  }

  async signOut(): Promise<AuthSignOutResult> {
    const client = await this.getClient()
    const { error } = await client.signOut()
    await this.userAuthService.clearToken()
    if (error) {
      return { state: 'error', message: error.message }
    }
    return { state: 'success' }
  }

  async getSessionState(): Promise<AuthSessionState> {
    const client = await this.getClient()
    const { data, error } = await client.getSession()
    const token = await this.userAuthService.getToken()
    if (error || !data) {
      return { session: null, token }
    }
    return { session: this.mapSession(data), token }
  }

  private async getClient() {
    if (!this.client) {
      await this.userAuthService.ensureReady()
      this.client = createAuthClientInstance(this.userAuthService)
    }
    return this.client
  }

  private mapSession(data: unknown): AuthSessionInfo | null {
    if (!data || typeof data !== 'object') {
      return null
    }
    const user = (data as { user?: Record<string, unknown> }).user
    if (!user || typeof user !== 'object') {
      return null
    }
    const idValue = user.id
    return {
      user: {
        id: typeof idValue === 'string' ? idValue : String(idValue ?? ''),
        email: typeof user.email === 'string' ? user.email : null,
        name: typeof user.name === 'string' ? user.name : null,
        image: typeof user.image === 'string' ? user.image : null,
      },
    }
  }
}
