import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' assert { type: 'json' }

export const manifest = defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  action: { default_popup: 'index.html' },
  content_scripts: [
    { js: ['src/content/index.tsx'], matches: ['https://*/*', 'http://*/*'] },
  ],
  permissions: ['storage', 'unlimitedStorage', 'activeTab'],
  icons: {
    512: '512.png',
  },
})
