import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageCacheService } from './ImageCache.service'
import type { ImageDbService } from './ImageDb.service'

global.fetch = vi.fn()
global.FileReader = class {
  readAsDataURL() {
    this.onloadend && this.onloadend()
  }
  result = 'data:image/png;base64,mock'
  onloadend: (() => void) | null = null
  onerror: ((e: any) => void) | null = null
} as any

describe('ImageCacheService', () => {
  let service: ImageCacheService
  let mockDbService: any

  beforeEach(() => {
    mockDbService = {
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      pruneOldest: vi.fn(),
    } as unknown as ImageDbService

    service = new ImageCacheService(mockDbService)

    vi.mocked(global.fetch).mockReset()
    vi.mocked(global.fetch).mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['mock'])),
    } as Response)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should fetch from network if not in cache', async () => {
    mockDbService.get.mockResolvedValue(undefined)

    const result = await service.getOrFetch('http://example.com/image.png')

    expect(global.fetch).toHaveBeenCalledWith('http://example.com/image.png')
    expect(mockDbService.put).toHaveBeenCalled()
    expect(result).toBe('data:image/png;base64,mock')
  })

  it('should return cached value if in cache', async () => {
    mockDbService.get.mockResolvedValue({
      src: 'http://example.com/image.png',
      blob: new Blob(['cached']),
      timeUpdated: Date.now(),
      lastAccessed: Date.now() - 10 * 60 * 1000,
    })

    const result = await service.getOrFetch('http://example.com/image.png')

    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockDbService.update).toHaveBeenCalledWith(
      'http://example.com/image.png',
      expect.objectContaining({ lastAccessed: expect.any(Number) })
    )
    expect(result).toBe('data:image/png;base64,mock')
  })

  it('should revalidate if stale', async () => {
    const now = Date.now()
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000 + 1000

    mockDbService.get.mockResolvedValue({
      src: 'http://example.com/image.png',
      blob: new Blob(['cached']),
      timeUpdated: now - ONE_WEEK_MS,
      lastAccessed: now,
    })

    // fetch returns new blob
    vi.mocked(global.fetch).mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['new'])),
    } as Response)

    const result = await service.getOrFetch('http://example.com/image.png')

    expect(result).toBe('data:image/png;base64,mock')

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(global.fetch).toHaveBeenCalled()

    expect(mockDbService.put).toHaveBeenCalled()
  })

  it('should prune if capacity exceeded', async () => {
    mockDbService.count.mockResolvedValue(513)

    // trigger a put
    mockDbService.get.mockResolvedValue(undefined)

    // since prune is probabilistic, we mock Math.random to ensure it prunes
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    await service.getOrFetch('http://example.com/new.png')

    expect(mockDbService.count).toHaveBeenCalled()
    expect(mockDbService.pruneOldest).toHaveBeenCalledWith(1)
  })
})
