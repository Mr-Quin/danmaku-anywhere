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

vi.mock('@/popup/utils/isDetachedWindow', () => ({
  isDetachedWindow: vi.fn(),
}))

vi.mock('@/common/hooks/useIsInTab', () => ({
  useIsInTab: vi.fn(),
}))

import { useEnvironmentContext } from '@/common/environment/context'
import { useIsInTab } from '@/common/hooks/useIsInTab'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isDetachedWindow } from '@/popup/utils/isDetachedWindow'
import { useImportFlow } from './useImportFlow'

/**
 * Verifies that the toolbar popup detaches file/folder imports into a small
 * /import chrome.windows popup, so the OS file picker can't dismiss the parent
 * popup mid-flow. Detach only kicks in for the desktop action popup itself.
 * Controller, mobile, standalone-runtime web app, already-detached windows,
 * and popup.html opened directly in a tab must click the hidden input.
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
  vi.mocked(isDetachedWindow).mockReturnValue(false)
  vi.mocked(useIsInTab).mockReturnValue(false)
  mockPlatform(false)
  vi.mocked(chromeRpcClient.openPopupInNewWindow).mockResolvedValue(
    undefined as never
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useImportFlow detach behavior', () => {
  it('detaches openFileInput to a small /import window from the toolbar popup', () => {
    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledTimes(1)
    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'import' })
    )
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('detaches openFolderInput to the same /import window in toolbar popup', () => {
    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.folderInputRef as any).current = { click: clickSpy }

    result.current.openFolderInput()

    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'import' })
    )
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('clicks the input ref when popup.html is opened in a normal tab', () => {
    vi.mocked(useIsInTab).mockReturnValue(true)

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

  it('clicks the input ref when already in the detached chrome.windows popup', () => {
    vi.mocked(isDetachedWindow).mockReturnValue(true)

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
