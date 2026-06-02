import { TestBed } from '@angular/core/testing'
import { getExtensionAttr } from '@danmaku-anywhere/web-scraper'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionService } from './extension.service'
import { LATEST_EXTENSION_VERSION } from './latestExtensionVersion'

vi.mock('@danmaku-anywhere/web-scraper', async (importOriginal) => {
  const original = await importOriginal<object>()
  return {
    ...original,
    getExtensionAttr: vi.fn(() => ({})),
  }
})

const getExtensionAttrMock = vi.mocked(getExtensionAttr)

describe('ExtensionService', () => {
  let service: ExtensionService

  beforeEach(() => {
    vi.useFakeTimers()
    getExtensionAttrMock.mockReset()
    getExtensionAttrMock.mockReturnValue({})
    TestBed.configureTestingModule({})
    service = TestBed.inject(ExtensionService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in a loading state with no detected extension', () => {
    expect(service.$isLoading()).toBe(true)
    expect(service.$isExtensionInstalled()).toBe(false)
    expect(service.$isOutdated()).toBe(false)
  })

  it('stops loading without an installed version when polling times out', async () => {
    const init = service.init()
    await vi.advanceTimersByTimeAsync(1000)
    await init

    expect(service.$isLoading()).toBe(false)
    expect(service.$isExtensionInstalled()).toBe(false)
    expect(service.$installedVersion()).toBeNull()
  })

  it('detects an outdated extension version', async () => {
    getExtensionAttrMock.mockReturnValue({ id: 'ext-id', version: '0.0.1' })

    const init = service.init()
    await vi.advanceTimersByTimeAsync(100)
    await init

    expect(service.$installedVersion()).toBe('0.0.1')
    expect(service.$id()).toBe('ext-id')
    expect(service.$isExtensionInstalled()).toBe(true)
    expect(service.$isOutdated()).toBe(true)
    expect(service.$isLoading()).toBe(false)
  })

  it('does not flag the latest extension version as outdated', async () => {
    getExtensionAttrMock.mockReturnValue({
      id: 'ext-id',
      version: LATEST_EXTENSION_VERSION,
    })

    const init = service.init()
    await vi.advanceTimersByTimeAsync(100)
    await init

    expect(service.$installedVersion()).toBe(LATEST_EXTENSION_VERSION)
    expect(service.$isExtensionInstalled()).toBe(true)
    expect(service.$isOutdated()).toBe(false)
  })
})
