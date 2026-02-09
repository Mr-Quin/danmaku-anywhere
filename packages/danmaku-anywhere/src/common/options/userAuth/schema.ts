export type UserAuthState = {
  token: string | null
}

export const defaultUserAuthState: UserAuthState = {
  token: null,
}
