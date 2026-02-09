export type AuthUserInfo = {
  id: string
  email: string | null
  name: string | null
  image: string | null
}

export type AuthSessionInfo = {
  user: AuthUserInfo
}

export type AuthSessionState = {
  session: AuthSessionInfo | null
  token: string | null
}

export type AuthActionResult =
  | {
      state: 'success'
      session: AuthSessionInfo | null
      token: string | null
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
