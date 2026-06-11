import { env } from 'cloudflare:test'
import { vi } from 'vitest'
import { createRateLimiterMock } from './createMockRateLimiter'

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}

const createSecretMock = (value: string) => {
  return {
    get: vi.fn(async () => value),
  }
}

env.DANMAKU_GEMINI_API_KEY = createSecretMock('gemini-api')
env.DA_AI_GATEWAY_ID = createSecretMock('da-ai-gateway-id')
env.DA_AI_GATEWAY_NAME = createSecretMock('da-ai-gateway-name')
env.AXIOM_TOKEN = createSecretMock('axiom-token')
env.INTAKE_RATE_LIMITER = createRateLimiterMock()
