import { checkBuild, REBUILD_HINT } from './buildFreshness.ts'

// Refuses to run against a stale or wrong-env build/. Without this a direct
// `playwright test <spec>` silently loads whatever build/ holds, which reads as
// a real result. Building is left to the caller: CI has its own build step, and
// a build started from inside the runner would surface its failures as test
// startup noise.

export default function globalSetup(): void {
  if (process.env.DA_E2E_ALLOW_STALE_BUILD) {
    console.warn('[e2e] DA_E2E_ALLOW_STALE_BUILD set, skipping the build check')
    return
  }

  const result = checkBuild()
  if (!result.ok) {
    throw new Error(`[e2e] ${result.detail} ${REBUILD_HINT}`)
  }
}
