import { checkBuild, REBUILD_HINT } from './buildFreshness.ts'

// Refuses to run the suite against a stale or wrong-env build/. The pretest
// hook only fires via `pnpm test:e2e`; a direct `playwright test <spec>`
// silently loads whatever build/ holds, which looks like phantom test results.
// The freshness rules live in buildFreshness so the agent's verify preflight
// enforces exactly the same contract.

export default function globalSetup(): void {
  if (process.env.DA_E2E_ALLOW_STALE_BUILD) {
    console.warn('[e2e] DA_E2E_ALLOW_STALE_BUILD set, skipping freshness check')
    return
  }

  const result = checkBuild()
  if (!result.ok) {
    throw new Error(`[e2e] ${result.detail} ${REBUILD_HINT}`)
  }
}
