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

// Stylesheets in content-script shadow DOMs resolve url() against the host
// origin (→ 404). Loading via the extension origin makes the woff2 refs work.
// Standalone builds (vite.standalone.config.ts) run without chrome.* APIs at
// a regular HTTP origin, so the bundler-relative path resolves directly.
function toExtensionUrl(url: string): string {
  if (IS_STANDALONE_RUNTIME) {
    return url
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url
  }
  return chrome.runtime.getURL(url.replace(/^\//, ''))
}

export function injectFonts(target: ParentNode): void {
  for (const url of FONT_CSS_URLS) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = toExtensionUrl(url)
    target.append(link)
  }
}
