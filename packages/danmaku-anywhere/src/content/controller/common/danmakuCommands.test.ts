import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerApplyCommand } from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'
import { PlayerDanmakuState } from '@/content/player/playerDanmakuState'
import {
  CONTROLLER_SESSION,
  sendMount,
  sendUnmount,
  sendVisibility,
  syncFrame,
} from './danmakuCommands'

/**
 * Every change to what the players should show becomes a new version of one
 * desired state, recorded in the store before any player is told and sent to
 * every started frame. Holds the player RPC so commands can be delivered in
 * any order, feeds them to real player states, and asserts the store, the
 * results callers see and what each player ends up showing.
 */

interface Sent {
  frameId: number
  data: PlayerApplyCommand
  deliver: () => void
  fail: (error: unknown) => void
}

const rpc = vi.hoisted(() => ({ apply: vi.fn() }))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: { remoteLog: () => Promise.resolve() },
  playerRpcClient: {
    player: { 'relay:command:apply': rpc.apply },
  },
}))

let sent: Sent[] = []

function holdCommands() {
  rpc.apply.mockImplementation(
    (input: { frameId: number; data: PlayerApplyCommand }) => {
      return new Promise((resolve, reject) => {
        sent.push({
          ...input,
          deliver: () => {
            resolve({ data: undefined })
          },
          fail: reject,
        })
      })
    }
  )
}

function deliverAll() {
  for (const command of sent) {
    command.deliver()
  }
}

function sentTo(frameId: number) {
  return sent.filter((command) => command.frameId === frameId)
}

function episode(title: string) {
  return {
    id: 1,
    title,
    comments: [{ p: '0,1,16777215', m: title }],
    commentCount: 1,
  } as never
}

interface Shown {
  comments: string[] | null
  visible: boolean
}

function playerFor(commands: PlayerApplyCommand[]): Shown {
  const shown: Shown = { comments: null, visible: true }
  const state = new PlayerDanmakuState({
    mount: (comments) => {
      shown.comments = comments.map((comment) => comment.m)
    },
    unmount: () => {
      shown.comments = null
    },
    setVisible: (visible) => {
      shown.visible = visible
    },
  })
  state.adopt(CONTROLLER_SESSION)
  for (const command of commands) {
    state.apply(command)
  }
  return shown
}

function expectedFor(frameId: number): Shown {
  const { mountedFrameId, comments, isVisible } = useStore.getState().danmaku
  return {
    comments:
      frameId === mountedFrameId ? comments.map((comment) => comment.m) : null,
    visible: isVisible,
  }
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) {
    return [items]
  }
  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)]
    return permutations(rest).map((order) => {
      return [item, ...order]
    })
  })
}

function expectEveryOrderToSettle(frameId: number) {
  const commands = sentTo(frameId).map((command) => command.data)
  const expected = expectedFor(frameId)
  for (const order of permutations(commands)) {
    expect(playerFor(order)).toEqual(expected)
  }
}

function startFrame(frameId: number) {
  useStore.getState().frame.addFrame({
    frameId,
    url: `https://a.test/${frameId}`,
  })
  useStore.getState().frame.updateFrame(frameId, { started: true })
}

function activate(frameId: number) {
  useStore.getState().frame.setActiveFrame(frameId)
}

function mountedTitles() {
  return useStore.getState().danmaku.episodes?.map((e) => e.title)
}

const initialStore = useStore.getState()

beforeEach(() => {
  useStore.setState(initialStore, true)
  sent = []
  rpc.apply.mockReset()
  holdCommands()
  startFrame(0)
  startFrame(1)
  activate(0)
})

describe('sendMount', () => {
  it('records the episodes before the players answer and mounts them in the active frame only', async () => {
    const pending = sendMount([episode('A')])

    expect(mountedTitles()).toEqual(['A'])
    expect(useStore.getState().danmaku.mountedFrameId).toBe(0)
    expect(sentTo(0)[0].data.content).toEqual({
      kind: 'mount',
      comments: [expect.objectContaining({ m: 'A' })],
    })
    expect(sentTo(1)[0].data.content).toEqual({ kind: 'unmount' })

    deliverAll()
    expect(await pending).toEqual({ status: 'mounted' })
  })

  it('sends nothing for a caller that already gave up', async () => {
    const controller = new AbortController()
    controller.abort()

    expect(await sendMount([episode('A')], controller.signal)).toEqual({
      status: 'cancelled',
    })
    expect(rpc.apply).not.toHaveBeenCalled()
    expect(mountedTitles()).toBeUndefined()
  })

  it('takes the danmaku back down when the caller gives up during the mount', async () => {
    const controller = new AbortController()
    const pending = sendMount([episode('A')], controller.signal)
    controller.abort()
    deliverAll()
    await vi.waitFor(() => {
      expect(sent).toHaveLength(4)
    })
    deliverAll()

    expect(await pending).toEqual({ status: 'cancelled' })
    expect(useStore.getState().danmaku.isMounted).toBe(false)
    expectEveryOrderToSettle(0)
  })

  it('reports cancelled to a mount replaced while it was sent', async () => {
    const first = sendMount([episode('A')])
    const second = sendMount([episode('B')])
    deliverAll()

    expect(await first).toEqual({ status: 'cancelled' })
    expect(await second).toEqual({ status: 'mounted' })
    expect(mountedTitles()).toEqual(['B'])
    expectEveryOrderToSettle(0)
  })

  it('stays mounted when only the visibility changed while it was sent', async () => {
    const pending = sendMount([episode('A')])
    const hiding = sendVisibility(false)
    deliverAll()
    await hiding

    expect(await pending).toEqual({ status: 'mounted' })
    expectEveryOrderToSettle(0)
  })

  it('takes the danmaku down and throws when the active frame cannot be reached', async () => {
    const pending = sendMount([episode('A')])
    sentTo(0)[0].fail(new Error('The player went away'))
    sentTo(1)[0].deliver()
    await vi.waitFor(() => {
      expect(sent).toHaveLength(4)
    })
    deliverAll()

    await expect(pending).rejects.toThrow('The player went away')
    expect(useStore.getState().danmaku.isMounted).toBe(false)
  })

  it('ignores a failure in a frame that does not show the danmaku', async () => {
    const pending = sendMount([episode('A')])
    sentTo(0)[0].deliver()
    sentTo(1)[0].fail(new Error('Gone'))

    expect(await pending).toEqual({ status: 'mounted' })
  })

  it('answers without waiting for a frame that does not show the danmaku', async () => {
    const pending = sendMount([episode('A')])
    sentTo(0)[0].deliver()

    expect(await pending).toEqual({ status: 'mounted' })
  })

  it('keeps a mount that moved to another frame when the old frame fails', async () => {
    const episodes = [episode('A')]
    const first = sendMount(episodes)
    activate(1)
    const moved = sendMount(episodes)
    for (const command of sentTo(1)) {
      command.deliver()
    }
    expect(await moved).toEqual({ status: 'mounted' })

    sentTo(0)[0].fail(new Error('Gone'))

    expect(await first).toEqual({ status: 'mounted' })
    expect(useStore.getState().danmaku.mountedFrameId).toBe(1)
  })

  it('throws without a frame to mount in', async () => {
    useStore.setState(initialStore, true)

    await expect(sendMount([episode('A')])).rejects.toThrow(
      'No active frame to mount danmaku'
    )
  })
})

describe('sendUnmount', () => {
  it('clears the store before the players answer', async () => {
    const mounting = sendMount([episode('A')])
    deliverAll()
    await mounting

    const pending = sendUnmount()
    expect(useStore.getState().danmaku.isMounted).toBe(false)
    deliverAll()
    await pending

    expectEveryOrderToSettle(0)
    expectEveryOrderToSettle(1)
  })

  it('takes down a mount still on its way to its frame', async () => {
    const mounting = sendMount([episode('A')])
    const unmounting = sendUnmount()
    deliverAll()

    expect(await mounting).toEqual({ status: 'cancelled' })
    await unmounting
    expectEveryOrderToSettle(0)
  })

  it('throws when the frame showing the danmaku cannot be reached', async () => {
    const mounting = sendMount([episode('A')])
    deliverAll()
    await mounting

    const pending = sendUnmount()
    sentTo(0)[1].fail(new Error('Gone'))
    sentTo(1)[1].deliver()

    await expect(pending).rejects.toThrow('Gone')
  })
})

describe('moving the danmaku to another frame', () => {
  it('leaves only the new active frame showing them, whatever order the commands arrive in', async () => {
    const first = sendMount([episode('A')])
    activate(1)
    const moved = sendMount([episode('A')])
    const hiding = sendVisibility(false)
    deliverAll()
    await Promise.all([first, moved, hiding])

    expect(useStore.getState().danmaku.mountedFrameId).toBe(1)
    expectEveryOrderToSettle(0)
    expectEveryOrderToSettle(1)
  })
})

describe('sendVisibility', () => {
  it('records the choice and tells every started frame without resending comments', async () => {
    const pending = sendVisibility(false)
    deliverAll()
    await pending

    expect(useStore.getState().danmaku.isVisible).toBe(false)
    expect(sent.map((command) => command.data.content)).toEqual([
      { kind: 'keep' },
      { kind: 'keep' },
    ])
  })

  it('does not throw when a player cannot be told', async () => {
    const pending = sendVisibility(false)
    sentTo(0)[0].fail(new Error('Gone'))
    sentTo(1)[0].deliver()

    await expect(pending).resolves.toBeUndefined()
  })
})

describe('frames that have not started', () => {
  it('get nothing until the handshake, which brings the current state', async () => {
    useStore.getState().frame.addFrame({ frameId: 2, url: 'https://c.test/' })
    activate(2)
    const mounting = sendMount([episode('A')])
    const hiding = sendVisibility(false)
    deliverAll()
    await Promise.all([mounting, hiding])
    expect(sentTo(2)).toEqual([])

    const syncing = syncFrame(2)
    deliverAll()
    await syncing

    expect(sentTo(2)).toHaveLength(1)
    expectEveryOrderToSettle(2)
  })
})

describe('removing the frame that shows the danmaku', () => {
  it('clears what is mounted', async () => {
    const mounting = sendMount([episode('A')])
    deliverAll()
    await mounting

    useStore.getState().frame.removeFrame(0)

    expect(useStore.getState().danmaku.isMounted).toBe(false)
  })
})
