import { execSync } from 'node:child_process'
import packageJson from '../package.json' with { type: 'json' }

const VERSION_SUFFIX = process.env.VERSION_SUFFIX
const BROWSER = process.env.VITE_TARGET_BROWSER ?? 'chrome'
const dev = process.env.NODE_ENV === 'development'
const IS_CHROME = BROWSER === 'chrome'
const IS_FIREFOX = BROWSER === 'firefox'

function detectGitBranch() {
  if (!dev) {
    return ''
  }
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return ''
  }
}
const GIT_BRANCH = detectGitBranch()

const VALID_DA_ENVS = ['dev', 'preview', 'prod', 'e2e']
function resolveDaEnv() {
  const explicit = process.env.VITE_DA_ENV
  if (explicit) {
    if (!VALID_DA_ENVS.includes(explicit)) {
      throw new Error(
        `VITE_DA_ENV must be one of ${VALID_DA_ENVS.join('|')}, got: ${explicit}`
      )
    }
    return explicit
  }
  return dev ? 'dev' : 'prod'
}
const DA_ENV = resolveDaEnv()

function getVersion() {
  if (!VERSION_SUFFIX) {
    return packageJson.version
  }
  return packageJson.version + `.${VERSION_SUFFIX}`
}

export function getBuildContext() {
  return {
    browser: {
      name: BROWSER,
      isChrome: IS_CHROME,
      isFirefox: IS_FIREFOX,
    },
    appVersion: getVersion(),
    isDev: dev,
    daEnv: DA_ENV,
    gitBranch: GIT_BRANCH,
  }
}
