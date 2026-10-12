import { describe, expect, it, vi } from 'vitest'
import { hasWebGpuAdapter } from './webgpu'

/**
 * WebGPU availability is decided by whether an adapter can be obtained, not by
 * the presence of `navigator.gpu`: no gpu object, a null adapter and a
 * rejected request all read as unavailable.
 */

function stubGpu(gpu: unknown) {
  vi.stubGlobal('navigator', { ...navigator, gpu })
}

describe('hasWebGpuAdapter', () => {
  it('is false without navigator.gpu', async () => {
    stubGpu(undefined)
    expect(await hasWebGpuAdapter()).toBe(false)
  })

  it('is false when navigator.gpu exists but yields no adapter', async () => {
    stubGpu({ requestAdapter: vi.fn().mockResolvedValue(null) })
    expect(await hasWebGpuAdapter()).toBe(false)
  })

  it('is false when the adapter request rejects', async () => {
    stubGpu({ requestAdapter: vi.fn().mockRejectedValue(new Error('no')) })
    expect(await hasWebGpuAdapter()).toBe(false)
  })

  it('is true when an adapter is returned', async () => {
    stubGpu({ requestAdapter: vi.fn().mockResolvedValue({}) })
    expect(await hasWebGpuAdapter()).toBe(true)
  })
})
