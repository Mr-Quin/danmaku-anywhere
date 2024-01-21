import { defineManifest } from '@crxjs/vite-plugin'

import pkg from './package.json' assert { type: 'json' }

export const manifest = defineManifest({
  manifest_version: 3,
  name: 'Danmaku Anywhere',
  version: pkg.version,
  action: {
    default_popup: 'pages/popup.html',
    default_title: 'Danmaku anywhere',
  },
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
    16: 'normal_16.png',
    32: 'normal_32.png',
    192: 'normal_192.png',
    512: 'normal_512.png',
  },
})
