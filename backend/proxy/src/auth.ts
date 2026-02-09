import { env } from 'cloudflare:workers'
import { createAuth } from './auth/config'

export const auth = await createAuth(env)
