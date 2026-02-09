import type { betterAuth } from 'better-auth'

export type AuthSession = ReturnType<typeof betterAuth>['$Infer']['Session']
export type AuthUser = AuthSession['user']
export type AuthSessionData = AuthSession['session']
