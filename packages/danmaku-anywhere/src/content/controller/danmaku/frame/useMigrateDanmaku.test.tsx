import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/common/components/Toast/toastStore'
import { sendMount } from '@/content/controller/common/danmakuCommands'
import { useStore } from '@/content/controller/store/store'
import { useMigrateDanmaku } from './useMigrateDanmaku'

/**
 * When the active frame changes, the danmaku the previous frame showed move to
 * the new frame without a toast. Nothing moves when what is mounted no longer
 * came from the previous frame. Mocks the player RPC and asserts the player
 * commands, the controller store and the toast store.
 */

const rpc = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: { remoteLog: () => Promise.resolve() },
  playerRpcClient: {
    player: {
      'relay:command:mount': rpc.mount,
      'relay:command:unmount': rpc.unmount,
    },
  },
}))

vi.mock('@/content/controller/common/hooks/useDescribeSourceError', () => ({
  useDescribeSourceError: () => () => ({ message: '' }),
}))

function episode(title: string) {
  return { id: 1, title, comments: [], commentCount: 0 } as never
}

function Migrate() {
  useMigrateDanmaku()
  return null
}

function activate(frameId: number) {
  act(() => {
    useStore.getState().frame.setActiveFrame(frameId)
  })
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function mountCallsTo(frameId: number) {
  return rpc.mount.mock.calls.filter(([input]) => input.frameId === frameId)
}

const initialStore = useStore.getState()
let root: Root | undefined

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  useStore.setState(initialStore, true)
  useToast.setState({ notifications: [] })
  for (const frameId of [0, 1, 2]) {
    useStore.getState().frame.addFrame({
      frameId,
      url: `https://a.test/${frameId}`,
    })
  }
  useStore.getState().frame.setActiveFrame(0)
  rpc.mount.mockReset().mockResolvedValue({ data: true })
  rpc.unmount.mockReset().mockResolvedValue({ data: true })
  await sendMount([episode('Show A')])

  root = createRoot(document.createElement('div'))
  act(() => {
    root?.render(
      <QueryClientProvider client={new QueryClient()}>
        <Migrate />
      </QueryClientProvider>
    )
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
})

describe('useMigrateDanmaku', () => {
  it('moves the danmaku to the new frame without a toast', async () => {
    activate(1)
    await settle()

    expect(rpc.unmount).toHaveBeenCalledWith({ frameId: 0 })
    expect(mountCallsTo(1)).toHaveLength(1)
    expect(useStore.getState().danmaku.mountedFrameId).toBe(1)
    expect(useToast.getState().notifications).toEqual([])
  })

  it('moves nothing when what is mounted came from another frame', async () => {
    const { danmaku } = useStore.getState()
    danmaku.commitMount(danmaku.issueCommand(2), 2, [episode('Show B')])
    activate(1)
    await settle()

    expect(mountCallsTo(1)).toHaveLength(0)
  })
})
