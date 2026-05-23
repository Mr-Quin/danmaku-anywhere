import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/common/environment/context', () => ({
  useEnvironmentContext: vi.fn(),
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
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isStandaloneWindow } from '@/popup/utils/isStandaloneWindow'
import { useImportFlow } from './useImportFlow'

/**
 * Verifies that the toolbar popup detaches file/folder imports into a new
 * chrome.windows popup, so the OS file picker can't dismiss the parent popup
 * mid-flow. Detach only kicks in for `type === 'popup'` and not for a window
 * already opened as standalone (`?standalone=1`). Controller and already
 * detached popups must click the hidden input directly.
 */

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(useEnvironmentContext).mockReturnValue({
    environment: 'test',
    type: 'popup',
  })
  vi.mocked(isStandaloneWindow).mockReturnValue(false)
  vi.mocked(chromeRpcClient.openPopupInNewWindow).mockResolvedValue(
    undefined as never
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useImportFlow detach behavior', () => {
  it('detaches to a new window with autoImport=files when called from toolbar popup', () => {
    const { result } = renderHook(() => useImportFlow(), {
      wrapper: makeWrapper(),
    })

    const clickSpy = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning ref for spy
    ;(result.current.fileInputRef as any).current = { click: clickSpy }

    result.current.openFileInput()

    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledTimes(1)
    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledWith(
      'mount?autoImport=files'
    )
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

    expect(chromeRpcClient.openPopupInNewWindow).toHaveBeenCalledWith(
      'mount?autoImport=folder'
    )
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
})
