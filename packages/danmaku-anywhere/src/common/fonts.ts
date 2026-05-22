import notoSansJpCssUrl from '@fontsource-variable/noto-sans-jp/wght.css?url'
import notoSansScCssUrl from '@fontsource-variable/noto-sans-sc/wght.css?url'
import notoSansTcCssUrl from '@fontsource-variable/noto-sans-tc/wght.css?url'
import plusJakartaSansCssUrl from '@fontsource-variable/plus-jakarta-sans/wght.css?url'
import { IS_DA_DEV } from '@/common/constants'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { Logger } from '@/common/Logger'

const FONT_CSS_URLS = [
  plusJakartaSansCssUrl,
  notoSansScCssUrl,
  notoSansTcCssUrl,
  notoSansJpCssUrl,
]

// Absolute URL needed for content-script-injected <link>. In dev, hit the
// Vite server directly — crxjs's SW proxy 504s on host-initiated fetches.
function toFontUrl(url: string): string {
  if (IS_STANDALONE_RUNTIME || !url.startsWith('/')) {
    return url
  }
  if (IS_DA_DEV) {
    return `${import.meta.env.VITE_DEV_SERVER_URL}${url}`
  }
  return chrome.runtime.getURL(url.slice(1))
}

export function injectFonts(target: ParentNode): void {
  // Fonts are non-essential — never let an unexpected DOM state crash
  // the popup bootstrap or the controller mount.
  try {
    for (const url of FONT_CSS_URLS) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = toFontUrl(url)
      target.append(link)
    }
  } catch (error) {
    Logger.warn('injectFonts failed', error)
  }
}
