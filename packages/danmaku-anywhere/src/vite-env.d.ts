/// <reference types="vite/client" />
/// <reference types="urlpattern-polyfill" />
interface ImportMetaEnv {
  readonly VITE_PROXY_URL: string
  readonly VITE_PROXY_ORIGIN: string
  readonly VITE_TARGET_BROWSER: 'chrome' | 'firefox'
  readonly VITE_STANDALONE?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
