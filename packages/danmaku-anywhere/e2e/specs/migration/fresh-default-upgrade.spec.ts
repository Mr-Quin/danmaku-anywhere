import { expect, test } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import {
  dismissReleaseNotes,
  readOptionsSnapshot,
  schemaViolations,
} from '../../setup/migrationState'
import {
  migrationErrors,
  upgradeToCurrentBuild,
  withPriorInstall,
} from '../../setup/priorInstall'

/**
 * The most common store user: v1.5.0 installed and never configured, so the
 * only state is what v1.5.0 seeded itself, including its three built-in
 * provider configs. Swaps to the current build and asserts the providers page
 * lists exactly those three sources, enabled and not duplicated, every options
 * store parses against its current schema, and nothing logged an error.
 */

interface LegacyBackup {
  services: Record<string, { version: number; data: unknown }>
}

test.setTimeout(120_000)

test('a v1.5.0 install left on its defaults upgrades cleanly', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures arg
{}, testInfo) => {
  await withPriorInstall(
    testInfo,
    async ({ context, consoleWatcher, currentExt }) => {
      const legacy = await MigrationLegacyPopup.open(
        context,
        MIGRATION_EXTENSION_ID
      )
      const seeded = (await legacy.exportBackup()) as LegacyBackup
      await legacy.close()
      const seededProviders = seeded.services.providerConfig?.data as Array<{
        id: string
      }>
      expect(
        seededProviders.map((config) => config.id),
        'v1.5.0 seeded its own built-in providers'
      ).toEqual(['builtin:dandanplay', 'builtin:bilibili', 'builtin:tencent'])
      const seededOptions = seeded.services.extensionOptions?.data as {
        id: string
        lang: string
      }

      await upgradeToCurrentBuild(context, currentExt)

      const page = await context.newPage()
      const popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/providers')
      await dismissReleaseNotes(page)
      await expect(popup.providers.installedHeading(3)).toBeVisible()
      await expect(popup.providers.switches()).toHaveCount(3)
      await expect(popup.providers.switches({ checked: true })).toHaveCount(3)

      const snapshot = await readOptionsSnapshot(page)
      expect(
        await schemaViolations(page, snapshot),
        'every options store parses against its current schema'
      ).toEqual({})
      const providers = snapshot.providerConfig?.data as Array<{
        id: string
        enabled: boolean
      }>
      expect(
        providers.map((config) => [config.id, config.enabled]),
        'the seeded built-ins upgrade in place, nothing re-seeded beside them'
      ).toEqual([
        ['dandanplay', true],
        ['bilibili', true],
        ['tencent', true],
      ])
      expect(
        snapshot.extensionOptions?.data,
        'the install keeps its id and language'
      ).toMatchObject({ id: seededOptions.id, lang: seededOptions.lang })

      expect(
        migrationErrors(consoleWatcher),
        'console errors during the upgrade'
      ).toEqual([])
    }
  )
})
