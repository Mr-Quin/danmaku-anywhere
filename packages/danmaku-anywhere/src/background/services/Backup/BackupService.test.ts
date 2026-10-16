import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { ProviderService } from '@/background/services/providers/ProviderService'
import { createTestContainer } from '@/tests/createTestContainer'
import { BackupService } from './BackupService.service'
import { ConfigStateService } from './ConfigStateService'

function buildService(
  restoreState = vi.fn<ConfigStateService['restoreState']>(),
  localizeLegacyBuiltinNames = vi.fn<
    ProviderService['localizeLegacyBuiltinNames']
  >(async () => {})
) {
  return createTestContainer(
    [backgroundContainerModule],
    [
      { identifier: ConfigStateService, value: { restoreState } },
      { identifier: ProviderService, value: { localizeLegacyBuiltinNames } },
    ]
  ).get(BackupService)
}

describe('BackupService.importAll', () => {
  it('parses a JSON string backup and restores it', async () => {
    const restoreState = vi.fn<ConfigStateService['restoreState']>(
      async () => ({ success: true, details: {} })
    )
    const service = buildService(restoreState)

    await service.importAll('{"meta":{"version":1},"services":{}}')

    expect(restoreState).toHaveBeenCalledWith({
      meta: { version: 1 },
      services: {},
    })
  })

  it('localizes built-in names after restoring a pre-manifest provider backup', async () => {
    const restoreState = vi.fn<ConfigStateService['restoreState']>(
      async () => ({
        success: true,
        details: { providerConfig: { success: true } },
      })
    )
    const localize = vi.fn<ProviderService['localizeLegacyBuiltinNames']>(
      async () => {}
    )
    const service = buildService(restoreState, localize)

    await service.importAll({
      meta: { version: 1 },
      services: { providerConfig: { version: 1, data: [] } },
    })

    expect(localize).toHaveBeenCalledTimes(1)
  })

  it('leaves built-in names alone when the pre-manifest provider restore failed', async () => {
    const restoreState = vi.fn<ConfigStateService['restoreState']>(
      async () => ({
        success: false,
        details: { providerConfig: { success: false, error: 'invalid' } },
      })
    )
    const localize = vi.fn<ProviderService['localizeLegacyBuiltinNames']>(
      async () => {}
    )
    const service = buildService(restoreState, localize)

    await service.importAll({
      meta: { version: 1 },
      services: { providerConfig: { version: 1, data: [] } },
    })

    expect(localize).not.toHaveBeenCalled()
  })

  it('localizes built-in names when only another service failed to restore', async () => {
    const restoreState = vi.fn<ConfigStateService['restoreState']>(
      async () => ({
        success: false,
        details: {
          providerConfig: { success: true },
          danmakuOptions: { success: false, error: 'invalid' },
        },
      })
    )
    const localize = vi.fn<ProviderService['localizeLegacyBuiltinNames']>(
      async () => {}
    )
    const service = buildService(restoreState, localize)

    await service.importAll({
      meta: { version: 1 },
      services: { providerConfig: { version: 1, data: [] } },
    })

    expect(localize).toHaveBeenCalledTimes(1)
  })

  it('leaves built-in names alone when restoring a current provider backup', async () => {
    const restoreState = vi.fn<ConfigStateService['restoreState']>(
      async () => ({ success: true, details: {} })
    )
    const localize = vi.fn<ProviderService['localizeLegacyBuiltinNames']>(
      async () => {}
    )
    const service = buildService(restoreState, localize)

    await service.importAll({
      meta: { version: 1 },
      services: { providerConfig: { version: 5, data: [] } },
    })

    expect(localize).not.toHaveBeenCalled()
  })

  it('throws when the backup string is not valid JSON', async () => {
    const service = buildService()

    await expect(service.importAll('not json')).rejects.toThrow(
      'Failed to parse backup data as JSON'
    )
    await expect(service.importAll('not json')).rejects.toMatchObject({
      code: 'backup.notJson',
    })
  })
})
