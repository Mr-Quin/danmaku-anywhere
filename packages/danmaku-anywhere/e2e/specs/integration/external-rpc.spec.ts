import { ExternalCallerPage } from '../../pom/ExternalCallerPage'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Exercises the externally_connectable boundary from a real web page. An
 * allowlisted command (mountConfigCreate) lands and its config shows up in the
 * popup's config list; commands off the allowlist come back rejected instead of
 * running; and the plaintext http origin cannot reach the extension at all.
 */

// Every denied call goes through the RPC server's handler-error path, which
// logs at error level.
test.use({ expectedConsoleErrors: ['is not available to external callers'] })

const APP_URL = 'https://danmaku.weeblify.app/'
const PLAINTEXT_URL = 'http://danmaku.weeblify.app/'

const CONFIG_NAME = 'External Onboarding Config'
const CONFIG_INPUT = {
  name: CONFIG_NAME,
  patterns: ['https://external-rpc.e2e.invalid/*'],
  mediaQuery: 'video',
  enabled: true,
}

test('external rpc: allowlisted command lands, the rest are rejected', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const caller = await ExternalCallerPage.open(context, extensionId, APP_URL)

  const created = await caller.call('mountConfigCreate', CONFIG_INPUT)
  expect(created.reached).toBe(true)
  expect(created.state).toBe('success')

  const popup = await Popup.open(page, extensionId, '/config')
  await popup.config.expectRow(CONFIG_NAME)

  const listed = await caller.call('mountConfigGetAll')
  expect(listed.state).toBe('success')

  for (const method of ['backupExport', 'dataWipeDanmaku', 'setHeaders']) {
    const denied = await caller.call(method)
    expect(denied.state).toBe('errored')
    expect(denied.error).toBe(
      `Method ${method} is not available to external callers`
    )
  }
})

test('external rpc: a plaintext http origin cannot reach the extension', async ({
  context,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const caller = await ExternalCallerPage.open(
    context,
    extensionId,
    PLAINTEXT_URL
  )

  // lint-specs-allow-state-only: whether the browser hands a page the runtime
  // bridge is decided by the manifest, so there is no extension UI to assert on.
  const outcome = await caller.call('mountConfigGetAll')
  expect(outcome.reached).toBe(false)
})
