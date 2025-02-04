import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: 'https://api.dandanplay.net/swagger/v2/swagger.json',
  output: {
    path: 'src/providers/ddp/code-gen',
    format: 'prettier',
  },
  plugins: [
    {
      name: '@hey-api/typescript',
    },
    'zod',
    '@hey-api/client-fetch',
    {
      asClass: false, // default
      name: '@hey-api/sdk',
    },
  ],
})
