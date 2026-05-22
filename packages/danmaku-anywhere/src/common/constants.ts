import { matchUrl } from '@/common/utils/matchUrl'

export const EXTERNALLY_CONNECTABLE_PATTERNS = [
  '*://danmaku.weeblify.app/*',
  ...(import.meta.env.DEV ? ['http://localhost:4321/*'] : []),
]

export const IS_EXTERNALLY_CONNECTABLE = EXTERNALLY_CONNECTABLE_PATTERNS.some(
  (pattern) => {
    if (typeof window === 'undefined') return false
    return matchUrl(window.location.href, pattern)
  }
)

export const IS_FIREFOX = import.meta.env.VITE_TARGET_BROWSER === 'firefox'
export const IS_CHROME = import.meta.env.VITE_TARGET_BROWSER === 'chrome'

export type DaEnv = 'dev' | 'preview' | 'prod' | 'e2e'

export const DA_ENV: DaEnv = import.meta.env.VITE_DA_ENV
export const IS_DA_DEV = DA_ENV === 'dev'
export const IS_DA_PREVIEW = DA_ENV === 'preview'
export const IS_DA_PROD = DA_ENV === 'prod'
export const IS_DA_E2E = DA_ENV === 'e2e'

export function isDaEnv(...envs: DaEnv[]): boolean {
  return envs.includes(DA_ENV)
}

export const EXTENSION_VERSION = import.meta.env.VERSION

export const DEV_BRANCH = import.meta.env.VITE_DA_BRANCH

export const EXTENSION_REPO = 'https://github.com/Mr-Quin/danmaku-anywhere'

export const BUG_FORM =
  'https://forms.clickup.com/90131020449/f/2ky3men1-933/ULQ3OZ8QYRXIJ5HACI'

export const FEEDBACK_FORM =
  'https://forms.clickup.com/90131020449/f/2ky3men1-873/D9MSB7XJYAFS02Q9NO'
