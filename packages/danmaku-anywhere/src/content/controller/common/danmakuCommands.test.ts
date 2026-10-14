import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '@/content/controller/store/store'
import { sendMount, sendUnmount, sendVisibility } from './danmakuCommands'

/**
 * Mount, unmount and visibility commands go to a frame's player, and replies
 * can arrive late or out of order. Each frame's mounted flag only follows a
 * reply newer than the last one recorded for that frame, and what is mounted
 * only follows a reply newer than the one that last set it. A mount whose
 * caller gave up while the player was loading it takes itself back down unless
 * something newer was sent to that frame. Mocks the player RPC and asserts the
 * player calls and the controller store.
 */

const rpc = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
  show: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: { remoteLog: () => Promise.resolve() },
  playerRpcClient: {
    player: {
      'relay:command:mount': rpc.mount,
      'relay:command:unmount': rpc.unmount,
      'relay:command:show': rpc.show,
    },
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function episode(title: string) {
  return {
    id: 1,
    title,
    comments: [{ p: '0,1,16777215', m: title }],
    commentCount: 1,
  } as never
}

function mountedState() {
  const { danmaku } = useStore.getState()
  return {
    isMounted: danmaku.isMounted,
    titles: danmaku.episodes?.map((e) => e.title),
    frameId: danmaku.mountedFrameId,
  }
}

function frameMounted(frameId: number) {
  return useStore.getState().frame.allFrames.get(frameId)?.mounted
}

function activate(frameId: number) {
  useStore.getState().frame.setActiveFrame(frameId)
}

const NOTHING_MOUNTED = {
  isMounted: false,
  titles: undefined,
  frameId: undefined,
}

const initialStore = useStore.getState()

beforeEach(() => {
  useStore.setState(initialStore, true)
  useStore.getState().frame.addFrame({ frameId: 0, url: 'https://a.test/' })
  useStore.getState().frame.addFrame({ frameId: 1, url: 'https://b.test/' })
  activate(0)
  rpc.mount.mockReset().mockResolvedValue({ data: true })
  rpc.unmount.mockReset().mockResolvedValue({ data: true })
  rpc.show.mockReset().mockResolvedValue({ data: undefined })
})

describe('sendMount', () => {
  it('records the mounted episodes once the player has them', async () => {
    const result = await sendMount([episode('A')])

    expect(result).toEqual({ status: 'mounted' })
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['A'],
      frameId: 0,
    })
    expect(frameMounted(0)).toBe(true)
  })

  it('sends nothing for a caller that already gave up', async () => {
    const controller = new AbortController()
    controller.abort()

    const result = await sendMount([episode('A')], controller.signal)

    expect(result).toEqual({ status: 'cancelled' })
    expect(rpc.mount).not.toHaveBeenCalled()
  })

  it('takes the danmaku back down when the caller gives up during the mount', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    const controller = new AbortController()

    const pending = sendMount([episode('A')], controller.signal)
    controller.abort()
    mountA.resolve({ data: true })

    expect(await pending).toEqual({ status: 'cancelled' })
    expect(rpc.unmount).toHaveBeenCalledWith(
      expect.objectContaining({ frameId: 0 })
    )
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(frameMounted(0)).toBe(false)
  })

  it('leaves the frame to a newer command sent to it', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    const controller = new AbortController()

    const pendingA = sendMount([episode('A')], controller.signal)
    controller.abort()
    await sendMount([episode('B')])
    mountA.resolve({ data: true })

    expect(await pendingA).toEqual({ status: 'cancelled' })
    expect(rpc.unmount).not.toHaveBeenCalled()
    expect(mountedState().titles).toEqual(['B'])
  })

  it('still takes itself down when only another frame got a newer command', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    const controller = new AbortController()

    const pendingA = sendMount([episode('A')], controller.signal)
    activate(1)
    await sendMount([episode('B')])
    controller.abort()
    mountA.resolve({ data: true })
    await pendingA

    expect(rpc.unmount).toHaveBeenCalledWith(
      expect.objectContaining({ frameId: 0 })
    )
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['B'],
      frameId: 1,
    })
    expect(frameMounted(0)).toBe(false)
    expect(frameMounted(1)).toBe(true)
  })

  it('does not overwrite a newer mount that finished first', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)

    const pendingA = sendMount([episode('A')])
    await sendMount([episode('B')])
    mountA.resolve({ data: true })
    await pendingA

    expect(mountedState().titles).toEqual(['B'])
  })

  it('tells the player whether the danmaku start hidden', async () => {
    useStore.getState().danmaku.toggleVisible(false)

    await sendMount([episode('A')])

    expect(rpc.mount).toHaveBeenCalledWith({
      frameId: 0,
      data: {
        comments: expect.any(Array),
        visible: false,
        order: expect.any(Object),
      },
    })
    expect(rpc.show).not.toHaveBeenCalled()
  })
})

describe('sendUnmount', () => {
  it('clears the store once the player has unmounted', async () => {
    await sendMount([episode('A')])
    await sendUnmount()

    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(frameMounted(0)).toBe(false)
  })

  it('does not clear a mount that was sent after it', async () => {
    await sendMount([episode('A')])
    const unmount = deferred<{ data: boolean }>()
    rpc.unmount.mockReturnValueOnce(unmount.promise)

    const pending = sendUnmount()
    await sendMount([episode('B')])
    unmount.resolve({ data: true })
    await pending

    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['B'],
      frameId: 0,
    })
    expect(frameMounted(0)).toBe(true)
  })

  it('still clears the store when the mount sent after it fails', async () => {
    await sendMount([episode('A')])
    const unmount = deferred<{ data: boolean }>()
    rpc.unmount.mockReturnValueOnce(unmount.promise)
    rpc.mount.mockResolvedValueOnce({ data: false })

    const pending = sendUnmount()
    await expect(sendMount([episode('B')])).rejects.toThrow()
    unmount.resolve({ data: true })
    await pending

    expect(mountedState().isMounted).toBe(false)
  })
})

describe('moving danmaku to another frame', () => {
  it('marks the old frame unmounted when the new mount replies first', async () => {
    await sendMount([episode('A')])
    const unmountA = deferred<{ data: boolean }>()
    rpc.unmount.mockReturnValueOnce(unmountA.promise)

    const pendingUnmount = sendUnmount(0)
    activate(1)
    await sendMount([episode('A')])
    unmountA.resolve({ data: true })
    await pendingUnmount

    expect(frameMounted(0)).toBe(false)
    expect(frameMounted(1)).toBe(true)
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['A'],
      frameId: 1,
    })

    useStore.getState().frame.removeFrame(0)
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['A'],
      frameId: 1,
    })
  })
})

describe('removing a frame', () => {
  it('clears what is mounted when the frame held it', async () => {
    await sendMount([episode('A')])

    useStore.getState().frame.removeFrame(0)

    expect(mountedState()).toEqual(NOTHING_MOUNTED)
  })

  it('ignores replies to commands sent to the removed frame', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    const controller = new AbortController()

    const pending = sendMount([episode('A')], controller.signal)
    useStore.getState().frame.removeFrame(0)
    useStore.getState().frame.addFrame({ frameId: 0, url: 'https://a.test/' })
    controller.abort()
    mountA.resolve({ data: true })
    await pending

    expect(mountedState()).toEqual(NOTHING_MOUNTED)
    expect(frameMounted(0)).toBe(false)
    expect(rpc.unmount).not.toHaveBeenCalled()
  })
})

describe('sendVisibility', () => {
  it('carries a hide pressed while the player is still taking it to a mount sent meanwhile', async () => {
    const hide = deferred<{ data: undefined }>()
    rpc.show.mockReturnValueOnce(hide.promise)

    const hiding = sendVisibility(false)
    await sendMount([episode('A')])
    hide.resolve({ data: undefined })
    await hiding

    expect(rpc.mount).toHaveBeenCalledWith({
      frameId: 0,
      data: {
        comments: expect.any(Array),
        visible: false,
        order: expect.any(Object),
      },
    })
    expect(useStore.getState().danmaku.isVisible).toBe(false)
  })

  it('keeps the choice when the player cannot be told, for the next mount to apply', async () => {
    rpc.show.mockRejectedValueOnce(new Error('frame gone'))

    await expect(sendVisibility(false)).rejects.toThrow('frame gone')
    await sendMount([episode('A')])

    expect(useStore.getState().danmaku.isVisible).toBe(false)
    expect(rpc.mount).toHaveBeenCalledWith({
      frameId: 0,
      data: {
        comments: expect.any(Array),
        visible: false,
        order: expect.any(Object),
      },
    })
  })

  it('goes to the frame holding the danmaku, not just the active one', async () => {
    await sendMount([episode('A')])
    activate(1)

    await sendVisibility(false)

    expect(rpc.show).toHaveBeenCalledWith({
      frameId: 0,
      data: { visible: false, order: expect.any(Object) },
    })
  })
})

describe('a mount that replies after another frame became active', () => {
  it('is what an unmount without a frame reaches', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)

    const pendingA = sendMount([episode('A')])
    activate(1)
    mountA.resolve({ data: true })
    await pendingA
    await sendUnmount()
    await sendMount([episode('B')])

    expect(rpc.unmount).toHaveBeenCalledWith(
      expect.objectContaining({ frameId: 0 })
    )
    expect(frameMounted(0)).toBe(false)
    expect(frameMounted(1)).toBe(true)
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['B'],
      frameId: 1,
    })
  })
})

describe('a mount whose reply loses the record to another frame', () => {
  it('takes itself down and reports cancelled', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)

    const pendingA = sendMount([episode('A')])
    activate(1)
    await sendMount([episode('B')])
    mountA.resolve({ data: true })

    expect(await pendingA).toEqual({ status: 'cancelled' })
    expect(rpc.unmount).toHaveBeenCalledWith(
      expect.objectContaining({ frameId: 0 })
    )
    expect(frameMounted(0)).toBe(false)
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['B'],
      frameId: 1,
    })
  })

  it('leaves its frame alone when something newer went to that frame', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    const unmountA = deferred<{ data: boolean }>()
    rpc.unmount.mockReturnValueOnce(unmountA.promise)

    const pendingA = sendMount([episode('A')])
    const pendingUnmount = sendUnmount(0)
    activate(1)
    await sendMount([episode('B')])
    mountA.resolve({ data: true })

    expect(await pendingA).toEqual({ status: 'cancelled' })
    expect(rpc.unmount).toHaveBeenCalledTimes(1)
    unmountA.resolve({ data: true })
    await pendingUnmount
    expect(frameMounted(0)).toBe(false)
  })
})

describe('a mount whose frame was removed while it was sent', () => {
  it('reports cancelled', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)

    const pendingA = sendMount([episode('A')])
    useStore.getState().frame.removeFrame(0)
    mountA.resolve({ data: true })

    expect(await pendingA).toEqual({ status: 'cancelled' })
    expect(mountedState()).toEqual(NOTHING_MOUNTED)
  })
})

describe('the order sent with each command', () => {
  it('numbers mount, visibility and unmount in the order they are sent', async () => {
    await sendMount([episode('A')])
    await sendVisibility(false)
    await sendUnmount()

    const orders = [
      rpc.mount.mock.calls[0][0].data.order,
      rpc.show.mock.calls[0][0].data.order,
      rpc.unmount.mock.calls[0][0].data.order,
    ]
    expect(new Set(orders.map((order) => order.session)).size).toBe(1)
    const numbers = orders.map((order) => order.command)
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
    expect(new Set(numbers).size).toBe(3)
  })

  it('does not stop a cancelled mount from taking itself down', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)
    const controller = new AbortController()

    const pending = sendMount([episode('A')], controller.signal)
    await sendVisibility(false)
    controller.abort()
    mountA.resolve({ data: true })
    await pending

    expect(rpc.unmount).toHaveBeenCalledWith(
      expect.objectContaining({ frameId: 0 })
    )
  })
})
