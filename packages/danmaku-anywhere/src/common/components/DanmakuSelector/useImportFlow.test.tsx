import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isStandaloneRuntime: false,
}))

vi.mock('@/common/environment/context', () => ({
  useEnvironmentContext: vi.fn(),
}))

vi.mock('@/common/environment/isStandalone', () => ({
  get IS_STANDALONE_RUNTIME() {
    return mocks.isStandaloneRuntime
  },
}))

vi.mock('@/common/hooks/usePlatformInfo', () => ({
  usePlatformInfo: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: {
    openPopupInNewWindow: vi.fn(),
  },
}))

vi.mock('@/popup/utils/isStandaloneWindow', () => ({
  isStandaloneWindow: vi.fn(),
}))

import { useEnvironmentContext } from '@/common/environment/context'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isStandaloneWindow } from '@/popup/utils/isStandaloneWindow'
import { useImportFlow } from './useImportFlow'

/**
 * Verifies that the toolbar popup detaches file/folder imports into a small
 * /import chrome.windows popup, so the OS file picker can't dismiss the parent
 * popup mid-flow. Detach only kicks in for desktop (`!isMobile`) popups that
 * aren't already standalone and aren't running in the standalone web-app build.
 * Controller, mobile, standalone runtime, and already-detached windows must
 * click the hidden input directly.
 */

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function mockPlatform(isMobile: boolean) {
  vi.mocked(usePlatformInfo).mockReturnValue({
    isMobile,
    // biome-ignore lint/suspicious/noExplicitAny: only isMobile is used by the hook under test
    platformInfo: {} as any,
  })
}

beforeEach(() => {
  mocks.isStandaloneRuntime = false
  vi.mocked(useEnvironmentContext).mockReturnValue({
    environment: 'test',
    type: 'popup',
  })
  vi.mocked(isStandaloneWindow).mockReturnValue(false)
  mockPlatform(false)
  vi.mocked(chromeRpcClient.openPopupInNewWindow).mockResolvedValue(
    undefined as never
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useImportFlow detach behavior', () => {
  it('detaches to a small /import window with autoImport=files from the toolbar popup', () => {
    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledTimes(1)
    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledWith({
      path: 'import?autoImport=files',
      width: 420,
      height: 280,
    })
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('detaches with autoImport=folder for openFolderInput in toolbar popup', () => {
    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.folderInputRef as any).current = { click: clickSpy }

    result.current.openFolderInput()

    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledWith({
      path: 'import?autoImport=folder',
      width: 420,
      height: 280,
    })
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('clicks the input ref when already in a standalone popup window', () => {
    vi.mocked(isStandaloneWindow).mockReturnValue(true)

    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).not.toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('clicks the input ref when invoked from the controller environment', () => {
    vi.mocked(useEnvironmentContext).mockReturnValue({
      environment: 'test',
      type: 'controller',
    })

    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).not.toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('clicks the input ref in the standalone web-app runtime even when env is popup', () => {
    mocks.isStandaloneRuntime = true

    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).not.toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('clicks the input ref on mobile so the picker opens in-place', () => {
    mockPlatform(true)

    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).not.toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
