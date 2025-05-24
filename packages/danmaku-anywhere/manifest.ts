import { defineManifest } from '@crxjs/vite-plugin'

import pkg from './package.json' with { type: 'json' }

const BROWSER = process.env.VITE_TARGET_BROWSER ?? 'chrome'

const dev = process.env.NODE_ENV === 'development'

const IS_CHROME = BROWSER === 'chrome'
const IS_FIREFOX = BROWSER === 'firefox'

const permissions: chrome.runtime.ManifestPermissions[] = [
  'storage',
  'unlimitedStorage',
  'activeTab',
  'scripting',
  'declarativeNetRequestWithHostAccess',
  'webNavigation',
  'alarms',
]

if (IS_CHROME) {
  permissions.push('fontSettings')
  permissions.push('contextMenus')
}

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
  options_page: 'pages/dashboard.html',
  permissions,
  host_permissions: ['https://*/*', 'http://*/*', 'file:///*'],
  externally_connectable:
    // not supported in firefox
    IS_FIREFOX
      ? undefined
      : {
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
  ...(BROWSER === 'firefox' && {
    browser_specific_settings: {
      gecko: {
        id: 'danmakuanywhere@quin.fish',
      },
    },
  }),
})
