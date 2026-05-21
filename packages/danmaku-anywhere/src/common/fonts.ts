import notoSansJpCssUrl from '@fontsource-variable/noto-sans-jp/wght.css?url'
import notoSansScCssUrl from '@fontsource-variable/noto-sans-sc/wght.css?url'
import notoSansTcCssUrl from '@fontsource-variable/noto-sans-tc/wght.css?url'
import plusJakartaSansCssUrl from '@fontsource-variable/plus-jakarta-sans/wght.css?url'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'

const FONT_CSS_URLS = [
  plusJakartaSansCssUrl,
  notoSansScCssUrl,
  notoSansTcCssUrl,
  notoSansJpCssUrl,
]

// In prod, font CSS lives at chrome-extension://<id>/assets/wght-*.css and can be
// fetched from any context (web_accessible_resources covers it). In dev, crxjs
// proxies chrome-extension://<id>/@fs/... through a service worker that 504s on
// host-page-initiated fetches; point straight at the Vite dev server instead.
function toFontUrl(url: string): string {
  if (IS_STANDALONE_RUNTIME || !url.startsWith('/')) {
    return url
  }
  if (import.meta.env.DEV) {
    return `${import.meta.env.VITE_DEV_SERVER_URL}${url}`
  }
  return chrome.runtime.getURL(url.slice(1))
}

export function injectFonts(target: ParentNode): void {
  for (const url of FONT_CSS_URLS) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = toFontUrl(url)
    target.append(link)
  }
}
