import { beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should debounce function calls', () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    // Call the debounced function multiple times
    debouncedFn('arg1')
    debouncedFn('arg2')
    debouncedFn('arg3')

    // Should not be called immediately
    expect(mockFn).not.toHaveBeenCalled()

    // Fast-forward time
    vi.advanceTimersByTime(100)

    // Should be called once with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg3')
  })

  it('should reset the timer on subsequent calls', () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn('arg1')

    // Advance time partially
    vi.advanceTimersByTime(50)
    expect(mockFn).not.toHaveBeenCalled()

    // Call again (should reset the timer)
    debouncedFn('arg2')

    // Advance time by 50ms more (total 100ms from first call, but only 50ms from second call)
    vi.advanceTimersByTime(50)
    expect(mockFn).not.toHaveBeenCalled()

    // Advance time by 50ms more (100ms from second call)
    vi.advanceTimersByTime(50)
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg2')
  })

  it('should work with different argument types', () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn(1, 'string', { key: 'value' })

    vi.advanceTimersByTime(100)

    expect(mockFn).toHaveBeenCalledWith(1, 'string', { key: 'value' })
  })
})
