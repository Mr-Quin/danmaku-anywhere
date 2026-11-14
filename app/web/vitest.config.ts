import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Node 25+ ships its own localStorage, which is undefined unless Node is
    // given a storage file, and it hides jsdom's working one from the specs.
    execArgv: ['--no-experimental-webstorage'],
  },
})
