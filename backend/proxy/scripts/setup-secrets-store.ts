import { execSync } from 'node:child_process'

const LOCAL_SECRET_STORE_ID = '4a9ca50edba84431879f34b0b67f9998'

const LOCAL_SECRETS = [
  {
    name: 'DANMAKU_GEMINI_API_KEY_STG',
    scope: 'workers',
    value: 'gemini-api',
  },
  {
    name: 'DA_AI_GATEWAY_ID_STG',
    scope: 'workers',
    value: 'da-ai-gateway-id',
  },
  {
    name: 'DA_AI_GATEWAY_NAME_STG',
    scope: 'workers',
    value: 'da-ai-gateway-name',
  },
  {
    name: 'BETTER_AUTH_SECRET_STG',
    scope: 'workers',
    value: 'better-auth-secret',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET_STG',
    scope: 'workers',
    value: 'google-client-secret',
  },
  {
    name: 'RESEND_API_KEY_STG',
    scope: 'workers',
    value: 'resend-api-key',
  },
]

async function setupSecretsStore() {
  for (const secret of LOCAL_SECRETS) {
    console.log(`Creating secret ${secret.name}...`)
    execSync(
      `pnpm wrangler secrets-store secret create ${LOCAL_SECRET_STORE_ID} --name ${secret.name} --scopes ${secret.scope} --value ${secret.value}`
    )
  }
}

void setupSecretsStore()
