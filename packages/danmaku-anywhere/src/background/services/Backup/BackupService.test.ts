import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { createTestContainer } from '@/tests/createTestContainer'
import { BackupService } from './BackupService.service'
import { ConfigStateService } from './ConfigStateService'

function buildService(
  restoreState = vi.fn<ConfigStateService['restoreState']>()
) {
  return createTestContainer(
    [backgroundContainerModule],
    [{ identifier: ConfigStateService, value: { restoreState } }]
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

  it('throws when the backup string is not valid JSON', async () => {
    const service = buildService()

    await expect(service.importAll('not json')).rejects.toThrow(
      'Failed to parse backup data as JSON'
    )
  })
})
