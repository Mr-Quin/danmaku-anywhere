import { defineManifest } from '@crxjs/vite-plugin'
import { getBuildContext } from './scripts/getBuildContext'

const { isDev, browser, appVersion } = getBuildContext()

const { isChrome, isFirefox } = browser

const permissions: chrome.runtime.ManifestPermissions[] = [
  'storage',
  'unlimitedStorage',
  'activeTab',
  'scripting',
  'declarativeNetRequestWithHostAccess',
  'webNavigation',
  'alarms',
  'webRequest',
  'contextMenus',
  'downloads',
]

if (isChrome) {
  permissions.push('fontSettings')
}

if (isDev) {
  permissions.push('declarativeNetRequestFeedback')
}

const APP_URLS = [
  'https://danmaku.weeblify.app/*', // prod
  'https://*.quinfish.workers.dev/*', // staging
  'http://localhost:4200/*', // local dev
]

export const manifest = defineManifest({
  manifest_version: 3,
  name: '__MSG_extName__',
  description: '__MSG_extDescription__',
  version: appVersion,
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
  content_scripts: [
    {
      matches: APP_URLS,
      js: ['src/content/app/index.ts'],
      run_at: 'document_start',
    },
  ],
  permissions,
  host_permissions: ['https://*/*', 'http://*/*', 'file:///*'],
  externally_connectable:
    // not supported in firefox
    isFirefox
      ? undefined
      : {
          matches: [
            '*://danmaku.weeblify.app/*',
            ...(isDev ? ['http://localhost:4321/*'] : []),
          ],
        },
  icons: {
    16: 'normal_16.png',
    32: 'normal_32.png',
    192: 'normal_192.png',
    512: 'normal_512.png',
  },
  default_locale: 'en',
  ...(isFirefox && {
    browser_specific_settings: {
      gecko: {
        id: 'danmakuanywhere@quin.fish',
      },
    },
  }),
  web_accessible_resources: [
    {
      matches: ['<all_urls>', 'file:///*'],
      resources: ['**/*', '*'],
      use_dynamic_url: false,
    },
  ],
  declarative_net_request: {
    rule_resources: [
      {
        id: 'bgm-next',
        enabled: true,
        path: 'rules/bgm.json',
      },
    ],
  },
})
