import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // docs and legacy are not pnpm workspaces
  ignore: ['docs/**', 'legacy/**'],
  workspaces: {
    '.': {
      entry: ['scripts/*.{ts,cjs}'],
    },
    'packages/result': {},
    'packages/integration-policy': {},
    'packages/bangumi-api': {},
    'packages/danmaku-converter': {},
    'packages/danmaku-engine': {},
    'packages/danmaku-provider': {
      entry: ['src/index.ts', 'src/providers/*/index.ts'],
    },
    'packages/web-scraper': {},
    'packages/danmaku-anywhere': {
      entry: [
        'src/background/index.ts',
        'src/content/app/index.ts',
        'src/content/player/index.ts',
        'src/popup/index.tsx',
        'manifest.ts',
        'vite.config.ts',
      ],
      playwright: false,
      vite: false,
    },
    'app/web': {},
    'backend/proxy': {
      ignoreDependencies: [
        // cloudflare module is provided by the Workers runtime
        'cloudflare',
      ],
    },
  },
}

export default config
