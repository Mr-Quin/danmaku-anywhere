import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, bearer, jwt, openAPI } from 'better-auth/plugins'
import { ac, adminRole, moderatorRole, userRole } from '@/auth/permissions'
import { getOrCreateDb } from '@/db'
import { getOrCreateEmailService } from '@/email'

async function getGoogleProvider(env: Env) {
  const clientId = env.GOOGLE_CLIENT_ID?.trim()

  const clientSecret = await env.GOOGLE_CLIENT_SECRET.get()

  if (!clientId || !clientSecret) {
    return undefined
  }

  return {
    clientId,
    clientSecret,
  }
}

// Updated per-request via setWaitUntil before auth handlers run
let currentWaitUntil: (promise: Promise<unknown>) => void = () => {
  // noop
}

export function setWaitUntil(
  waitUntil: (promise: Promise<unknown>) => void
): void {
  currentWaitUntil = waitUntil
}

async function createAuth(env: Env) {
  const secret = await env.BETTER_AUTH_SECRET.get()

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not configured')
  }

  const googleProvider = await getGoogleProvider(env)

  const baseURL = env.BETTER_AUTH_URL

  return betterAuth({
    appName: 'DanmakuAnywhere',
    baseURL,
    basePath: '/auth',
    secret,
    trustedOrigins: [env.BETTER_AUTH_TRUSTED_ORIGINS],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      sendResetPassword: async ({ user, token }) => {
        const resetUrl = `${baseURL}/pages/reset-password?token=${token}`
        const emailService = await getOrCreateEmailService(env)
        const promise = emailService.send({
          to: user.email,
          subject: 'Reset your password',
          text: `Click the link to reset your password: ${resetUrl}`,
        })
        currentWaitUntil(promise)
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const emailService = await getOrCreateEmailService(env)
        const promise = emailService.send({
          to: user.email,
          subject: 'Verify your email address',
          text: `Click the link to verify your email: ${url}`,
        })
        currentWaitUntil(promise)
      },
    },
    socialProviders: googleProvider ? { google: googleProvider } : {},
    database: drizzleAdapter(getOrCreateDb(env.DB), {
      provider: 'sqlite',
    }),
    plugins: [
      admin({
        ac,
        defaultRole: 'user',
        roles: {
          admin: adminRole,
          moderator: moderatorRole,
          user: userRole,
        },
      }),
      bearer(),
      openAPI(),
      jwt(),
    ],
    advanced: {
      disableOriginCheck: env.ENVIRONMENT === 'dev',
    },
  })
}

type MyAuth = Awaited<ReturnType<typeof createAuth>>

let auth: MyAuth | null = null

export async function getOrCreateAuth(env: Env): Promise<MyAuth> {
  if (auth) {
    return auth
  }

  auth = await createAuth(env)

  return auth
}
