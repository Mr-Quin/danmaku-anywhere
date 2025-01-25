import { defineManifest } from '@crxjs/vite-plugin'

import pkg from './package.json' with { type: 'json' }

const browser = process.env.TARGET_BROWSER ?? 'chrome'

const dev = process.env.NODE_ENV === 'development'

export const manifest = defineManifest({
  manifest_version: 3,
  name: '__MSG_extName__',
  description: '__MSG_extDescription__',
  version: pkg.version,
  action: {
    default_popup: 'pages/popup.html',
    default_title: 'Danmaku anywhere',
    default_icon: { 32: 'grey_32.png' },
  },
  background: {
    service_worker: 'src/background/index.ts',
    scripts: ['src/background/index.ts'],
    type: 'module',
  },
  permissions: [
    'storage',
    'unlimitedStorage',
    'activeTab',
    'scripting',
    'contextMenus',
    'declarativeNetRequestWithHostAccess',
    'webNavigation',
    'alarms',
  ],
  host_permissions: ['https://*/*', 'http://*/*', 'file:///*'],
  externally_connectable: {
    matches: [
      '*://danmaku.weeblify.app/*',
      ...(dev ? ['http://localhost:4321/*'] : []),
    ],
  },
  icons: {
    16: 'normal_16.png',
    32: 'normal_32.png',
    192: 'normal_192.png',
    512: 'normal_512.png',
  },
  default_locale: 'en',
  ...(browser === 'firefox' && {
    browser_specific_settings: {
      gecko: {
        id: 'danmakuanywhere@quin.fish',
      },
    },
  }),
})
