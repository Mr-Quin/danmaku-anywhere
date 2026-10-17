import { beforeEach, describe, expect, it } from 'vitest'
import { useToast } from './toastStore'

/**
 * Default toast durations: plain toasts close after a few seconds, while an
 * error that offers an action stays long enough to be read and clicked. An
 * explicit duration always wins. A toast with a caller id is replaced in place
 * by the next one with that id, until it closes.
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

describe('toastStore keyed toasts', () => {
  beforeEach(() => {
    useToast.setState({ notifications: [] })
  })

  it('replaces an open toast with the same id in place', () => {
    const { toast } = useToast.getState()
    toast.info('first')
    toast.info('Finding', { id: 'episode', duration: null, loading: true })
    toast.info('last')
    const before = useToast.getState().notifications[1]

    toast.success('Mounted', { id: 'episode' })

    const { notifications } = useToast.getState()
    expect(notifications.map((n) => n.message)).toEqual([
      'first',
      'Mounted',
      'last',
    ])
    expect(notifications[1]).toMatchObject({
      key: before.key,
      severity: 'success',
      duration: 3500,
      loading: undefined,
      revision: before.revision + 1,
    })
  })

  it('adds a new toast once the keyed one has closed', () => {
    const { toast, close } = useToast.getState()
    toast.info('Finding', { id: 'episode' })
    close(useToast.getState().notifications[0].key)

    toast.success('Mounted', { id: 'episode' })

    const { notifications } = useToast.getState()
    expect(notifications).toHaveLength(2)
    expect(notifications[1]).toMatchObject({ message: 'Mounted', open: true })
  })

  it('dismisses by id', () => {
    const { toast } = useToast.getState()
    toast.info('other')
    toast.info('Finding', { id: 'episode', duration: null })

    toast.dismiss('episode')

    expect(useToast.getState().notifications.map((n) => n.open)).toEqual([
      true,
      false,
    ])
  })

  it('keeps a null duration', () => {
    useToast.getState().toast.info('Finding', { duration: null })
    expect(lastDuration()).toBeNull()
  })
})
