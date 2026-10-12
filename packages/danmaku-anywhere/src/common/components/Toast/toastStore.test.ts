import { beforeEach, describe, expect, it } from 'vitest'
import { useToast } from './toastStore'

/**
 * Default toast durations: plain toasts close after a few seconds, while an
 * error that offers an action stays long enough to be read and clicked. An
 * explicit duration always wins.
 */

function lastDuration() {
  const { notifications } = useToast.getState()
  return notifications[notifications.length - 1]?.duration
}

describe('toastStore durations', () => {
  beforeEach(() => {
    useToast.setState({ notifications: [] })
  })

  it('closes a plain error after the default duration', () => {
    useToast.getState().toast.error('boom')
    expect(lastDuration()).toBe(3500)
  })

  it('keeps an error with an action for ten seconds', () => {
    useToast.getState().toast.error('boom', {
      actionFn: () => undefined,
      actionLabel: 'Fix',
    })
    expect(lastDuration()).toBe(10_000)
  })

  it('does not extend a success toast that has an action', () => {
    useToast.getState().toast.success('ok', {
      actionFn: () => undefined,
      actionLabel: 'Undo',
    })
    expect(lastDuration()).toBe(3500)
  })

  it('respects an explicit duration', () => {
    useToast.getState().toast.error('boom', {
      duration: 1000,
      actionFn: () => undefined,
    })
    expect(lastDuration()).toBe(1000)
  })
})
