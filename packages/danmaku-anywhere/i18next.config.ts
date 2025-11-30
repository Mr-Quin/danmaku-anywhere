import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'zh'],
  extract: {
    input: 'src/**/*.{js,jsx,ts,tsx}',
    output: 'src/common/localization/locales/{{language}}/{{namespace}}.json',
  },
})
