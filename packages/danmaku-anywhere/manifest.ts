import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' assert { type: 'json' }

export const manifest = defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  action: { default_popup: 'pages/popup.html' },
  options_page: 'pages/options.html',
  content_scripts: [
    {
      js: ['src/content/index.tsx'],
      matches: ['<all_urls>'],
      all_frames: true,
    },
  ],
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  permissions: ['storage', 'unlimitedStorage', 'activeTab', 'tabs'],
  icons: {
    512: '512.png',
  },
})
