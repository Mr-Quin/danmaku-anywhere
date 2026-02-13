import type { Session, User } from 'better-auth'

export type AuthUserInfo = User

export type AuthSessionState = {
  session: Session
  user: User
}

export type AuthSignInInput =
  | {
      provider: 'email'
      email: string
      password: string
    }
  | {
      provider: 'google'
    }

export type AuthSignUpInput = {
  provider: 'email'
  name: string
  email: string
  password: string
  image?: string
}

export type AuthActionResult =
  | {
      state: 'success'
      user: User
    }
  | {
      state: 'error'
      message: string
    }

export type AuthSignOutResult =
  | {
      state: 'success'
    }
  | {
      state: 'error'
      message: string
    }
