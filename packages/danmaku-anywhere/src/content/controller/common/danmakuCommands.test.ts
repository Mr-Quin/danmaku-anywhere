import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '@/content/controller/store/store'
import { sendMount, sendUnmount } from './danmakuCommands'

/**
 * Mount and unmount commands go to the active frame's player, and their
 * completions can arrive late or out of order. The store only follows a
 * completion when nothing sent after it has already updated it, and a mount
 * whose caller gave up while the player was loading it takes itself back down
 * unless something newer has been sent. Mocks the player RPC and asserts the
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
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
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
  const { danmaku, frame } = useStore.getState()
  return {
    isMounted: danmaku.isMounted,
    titles: danmaku.episodes?.map((e) => e.title),
    frameMounted: frame.allFrames.get(0)?.mounted,
  }
}

const initialStore = useStore.getState()

beforeEach(() => {
  useStore.setState(initialStore, true)
  useStore.getState().frame.addFrame({ frameId: 0, url: 'https://a.test/' })
  useStore.getState().frame.setActiveFrame(0)
  rpc.mount.mockReset().mockResolvedValue({ data: true })
  rpc.unmount.mockReset().mockResolvedValue({ data: true })
  rpc.show.mockReset().mockResolvedValue({ data: undefined })
})

describe('sendMount', () => {
  it('records the mounted episodes once the player has them', async () => {
    const result = await sendMount([episode('A')])

    expect(result).toEqual({ status: 'mounted', frameId: 0 })
    expect(mountedState()).toEqual({
      isMounted: true,
      titles: ['A'],
      frameMounted: true,
    })
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
    useStore.getState().danmaku.toggleVisible(false)
    const controller = new AbortController()

    const pending = sendMount([episode('A')], controller.signal)
    controller.abort()
    mountA.resolve({ data: true })

    expect(await pending).toEqual({ status: 'cancelled' })
    expect(rpc.unmount).toHaveBeenCalledWith({ frameId: 0 })
    expect(rpc.show).not.toHaveBeenCalled()
    expect(mountedState()).toEqual({
      isMounted: false,
      titles: undefined,
      frameMounted: false,
    })
  })

  it('leaves the player to a newer command when the caller gives up', async () => {
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

  it('does not overwrite a newer mount that finished first', async () => {
    const mountA = deferred<{ data: boolean }>()
    rpc.mount.mockReturnValueOnce(mountA.promise)

    const pendingA = sendMount([episode('A')])
    await sendMount([episode('B')])
    mountA.resolve({ data: true })
    await pendingA

    expect(mountedState().titles).toEqual(['B'])
  })

  it('carries a hidden state over to the new mount', async () => {
    useStore.getState().danmaku.toggleVisible(false)

    await sendMount([episode('A')])

    expect(rpc.show).toHaveBeenCalledWith({ frameId: 0, data: false })
  })
})

describe('sendUnmount', () => {
  it('clears the store once the player has unmounted', async () => {
    await sendMount([episode('A')])
    await sendUnmount()

    expect(mountedState()).toEqual({
      isMounted: false,
      titles: undefined,
      frameMounted: false,
    })
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
      frameMounted: true,
    })
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
