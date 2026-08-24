import { ensureE2eBuild } from '../../scripts/ensureE2eBuild.ts'

// Every Playwright entry point runs this, including a direct
// `playwright test <spec>` and UI mode, so the build is repaired here rather
// than in a pre-hook per test script. A full build is ~11s regardless of what
// changed, so it only runs when build/ no longer matches the tree.

export default function globalSetup(): void {
  if (process.env.DA_E2E_ALLOW_STALE_BUILD) {
    console.warn('[e2e] DA_E2E_ALLOW_STALE_BUILD set, skipping the build check')
    return
  }

  ensureE2eBuild()
}
