import { describe, expect, it, vi } from 'vitest'
import type { PlayerApplyCommand } from '@/common/rpcClient/background/types'
import { PlayerDanmakuState } from './playerDanmakuState'

const comments = [{ p: '0,1,16777215', m: 'hi' }]

function setup() {
  const player = { mount: vi.fn(), unmount: vi.fn(), setVisible: vi.fn() }
  return { player, state: new PlayerDanmakuState(player) }
}

function mount(version: number, session = 'a'): PlayerApplyCommand {
  return {
    session,
    version,
    contentVersion: version,
    content: { kind: 'mount', comments },
    visible: true,
  }
}

function unmount(version: number): PlayerApplyCommand {
  return {
    session: 'a',
    version,
    contentVersion: version,
    content: { kind: 'unmount' },
    visible: true,
  }
}

function hide(version: number, contentVersion: number): PlayerApplyCommand {
  return {
    session: 'a',
    version,
    contentVersion,
    content: { kind: 'keep' },
    visible: false,
  }
}

describe('PlayerDanmakuState', () => {
  it('ignores commands before a controller is adopted and from other controllers', () => {
    const { player, state } = setup()
    state.apply(mount(1))
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(mount(2, 'b'))

    expect(player.mount).not.toHaveBeenCalled()
    expect(player.setVisible).not.toHaveBeenCalled()
  })

  it('drops content older than what it applied', () => {
    const { player, state } = setup()
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(unmount(2))
    state.apply(mount(1))

    expect(player.unmount).toHaveBeenCalledTimes(1)
    expect(player.mount).not.toHaveBeenCalled()
  })

  it('takes a late mount without undoing a newer hide', () => {
    const { player, state } = setup()
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(hide(2, 1))
    state.apply(mount(1))

    expect(player.mount).toHaveBeenCalledWith(comments)
    expect(player.setVisible.mock.calls).toEqual([[false]])
  })

  it('keeps its versions when the same controller shakes hands again', () => {
    const { player, state } = setup()
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(mount(2))
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(mount(1))

    expect(player.mount).toHaveBeenCalledTimes(1)
  })

  it('only gives way to a controller that started later', () => {
    const { player, state } = setup()
    state.adopt({ id: 'b', startedAt: 2 })
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(mount(1))
    expect(player.mount).not.toHaveBeenCalled()

    state.adopt({ id: 'a', startedAt: 3 })
    state.apply(mount(1))
    expect(player.mount).toHaveBeenCalledTimes(1)
  })
  it('applies the first state of a newer controller, even at version 0', () => {
    const { player, state } = setup()
    state.adopt({ id: 'a', startedAt: 1 })
    state.apply(mount(2))
    state.apply(hide(3, 2))
    state.adopt({ id: 'b', startedAt: 2 })
    state.apply({
      session: 'b',
      version: 0,
      contentVersion: 0,
      content: { kind: 'unmount' },
      visible: true,
    })

    expect(player.unmount).toHaveBeenCalledTimes(1)
    expect(player.setVisible).toHaveBeenLastCalledWith(true)
  })
  it('orders controllers that started in the same millisecond by id', () => {
    const { state } = setup()
    expect(state.adopt({ id: 'b', startedAt: 1 })).toBe(true)

    expect(state.adopt({ id: 'a', startedAt: 1 })).toBe(false)
    expect(state.adopt({ id: 'c', startedAt: 1 })).toBe(true)
  })
})
