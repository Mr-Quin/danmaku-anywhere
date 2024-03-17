import { defineManifest } from '@crxjs/vite-plugin'

import pkg from './package.json' assert { type: 'json' }

export const manifest = defineManifest({
  manifest_version: 3,
  name: '__MSG_extName__',
  description: '__MSG_extDescription__',
  version: pkg.version,
  action: {
    default_popup: 'pages/popup.html',
    default_title: 'Danmaku anywhere',
  },
  options_page: 'pages/options.html',
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  permissions: [
    'storage',
    'unlimitedStorage',
    'activeTab',
    'scripting',
    'contextMenus',
  ],
  // permission to make requests to dandanplay for seraching and fetching comments
  host_permissions: ['https://*.dandanplay.net/*'],
  // @ts-expect-error
  // permission to inject content script into any page, to be requested at runtime
  optional_host_permissions: ['*://*/*'],
  icons: {
    16: 'normal_16.png',
    32: 'normal_32.png',
    192: 'normal_192.png',
    512: 'normal_512.png',
  },
  default_locale: 'en',
})
