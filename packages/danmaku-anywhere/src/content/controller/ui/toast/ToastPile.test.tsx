import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import { PILE_MAX_VISIBLE } from './pileLayout'
import { ToastPile } from './ToastPile'

/**
 * The in-page pile only counts down toasts someone can read: timers hold while
 * the tab is hidden, and toasts past what the pile can show are closed rather
 * than kept waiting. Renders the pile against the shared toast store and
 * asserts which toasts are still open.
 */

let root: Root | undefined

function setPageHidden(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

function renderPile() {
  root = createRoot(document.createElement('div'))
  act(() => {
    root?.render(<ToastPile />)
  })
}

function openMessages() {
  return useToast
    .getState()
    .notifications.filter((n) => n.open)
    .map((n) => n.message)
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    }
  )
  vi.useFakeTimers()
  useToast.setState({ notifications: [] })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  setPageHidden(false)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ToastPile', () => {
  it('closes toasts past what the pile can show', () => {
    renderPile()
    act(() => {
      for (let i = 0; i < PILE_MAX_VISIBLE + 2; i++) {
        useToast.getState().toast.info(`toast ${i}`)
      }
    })

    expect(openMessages()).toEqual(['toast 2', 'toast 3', 'toast 4', 'toast 5'])
  })

  it('holds the timers while the page is hidden', () => {
    renderPile()
    act(() => {
      setPageHidden(true)
      useToast.getState().toast.info('while away')
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(openMessages()).toEqual(['while away'])

    act(() => {
      setPageHidden(false)
    })
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(openMessages()).toEqual([])
  })
})
