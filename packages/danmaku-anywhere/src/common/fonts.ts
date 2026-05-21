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

// Shadow-DOM url() refs resolve against host origin; rewrite to extension origin.
function toExtensionUrl(url: string): string {
  if (IS_STANDALONE_RUNTIME || !url.startsWith('/')) {
    return url
  }
  return chrome.runtime.getURL(url.slice(1))
}

export function injectFonts(target: ParentNode): void {
  for (const url of FONT_CSS_URLS) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = toExtensionUrl(url)
    target.append(link)
  }
}
