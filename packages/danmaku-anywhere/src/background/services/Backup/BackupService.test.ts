import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackupData } from '@/common/backup/dto'
import { BackupService } from './BackupService.service'
import type { ConfigStateService } from './ConfigStateService'
import type { IBackupSink } from './sinks/BackupSink.interface'

vi.mock('./ConfigStateService', () => ({
  ConfigStateService: class {},
}))

describe('BackupService', () => {
  let service: BackupService
  let mockConfigStateService: any

  beforeEach(() => {
    mockConfigStateService = {
      getState: vi.fn(),
      restoreState: vi.fn(),
    } as unknown as ConfigStateService

    service = new BackupService(mockConfigStateService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should delegate getBackupData to ConfigStateService', async () => {
    const mockData = { meta: { version: 1 } } as any
    mockConfigStateService.getState.mockResolvedValue(mockData)

    const result = await service.getBackupData()

    expect(result).toBe(mockData)
    expect(mockConfigStateService.getState).toHaveBeenCalled()
  })

  it('should delegate importAll to ConfigStateService', async () => {
    const mockData = { meta: { version: 1 } } as any
    const mockResult = { success: true, details: {} }
    mockConfigStateService.restoreState.mockResolvedValue(mockResult)

    const result = await service.importAll(mockData)

    expect(result).toBe(mockResult)
    expect(mockConfigStateService.restoreState).toHaveBeenCalledWith(mockData)
  })

  it('should save to sink', async () => {
    const mockData = { meta: { version: 1 } } as unknown as BackupData
    mockConfigStateService.getState.mockResolvedValue(mockData)

    const mockSink: IBackupSink = {
      name: 'test-sink',
      save: vi.fn().mockResolvedValue(undefined),
    }

    await service.backupTo(mockSink)

    expect(mockConfigStateService.getState).toHaveBeenCalled()
    expect(mockSink.save).toHaveBeenCalledWith(mockData)
  })
})
