import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
})
