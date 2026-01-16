import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

if (process.env.DRIZZLE_ENV_FILE) {
  dotenv.config({
    path: process.env.DRIZZLE_ENV_FILE,
  })
}

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
})
