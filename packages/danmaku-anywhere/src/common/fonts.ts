import notoSansJpCss from '@fontsource-variable/noto-sans-jp/wght.css?inline'
import notoSansScCss from '@fontsource-variable/noto-sans-sc/wght.css?inline'
import notoSansTcCss from '@fontsource-variable/noto-sans-tc/wght.css?inline'
import plusJakartaSansCss from '@fontsource-variable/plus-jakarta-sans/wght.css?inline'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'

const FONT_CSS = [
  plusJakartaSansCss,
  notoSansScCss,
  notoSansTcCss,
  notoSansJpCss,
]

const URL_REF = /url\(\s*['"]?(\/[^)'" ]+)['"]?\s*\)/g

// Shadow-DOM url() refs resolve against host origin; rewrite woff2 paths
// inside the CSS to absolute chrome-extension URLs.
function rewriteUrls(css: string): string {
  if (IS_STANDALONE_RUNTIME) {
    return css
  }
  return css.replace(URL_REF, (_match, path: string) => {
    return `url('${chrome.runtime.getURL(path.slice(1))}')`
  })
}

export function injectFonts(target: ParentNode): void {
  const style = document.createElement('style')
  style.textContent = FONT_CSS.map(rewriteUrls).join('\n')
  target.append(style)
}
