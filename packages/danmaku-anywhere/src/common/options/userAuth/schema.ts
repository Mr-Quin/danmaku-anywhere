import type { AuthUserInfo } from '@/common/auth/types'

export type UserAuthState = {
  token: string | null
  user: AuthUserInfo | null
}

export const defaultUserAuthState: UserAuthState = {
  token: null,
  user: null,
}
