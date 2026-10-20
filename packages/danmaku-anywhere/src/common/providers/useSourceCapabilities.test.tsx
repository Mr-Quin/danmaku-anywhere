import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEpisode, makeSeason } from '@/tests/factories'
import {
  capabilitiesFromManifest,
  type SourceCapabilityAnswer,
  type UrlParseAnswer,
} from './sourceCapabilities'
import {
  useCanRefetchDanmaku,
  useSourceAnswers,
  useUrlParseAnswer,
} from './useSourceCapabilities'

/**
 * The UI asks the background what a source can do: refresh is offered only
 * when the episode's source can fetch danmaku, a failed answer does not hold
 * up search, and the search box asks which source reads text only when the
 * text is a link.
 */

const rpc = vi.hoisted(() => ({
  providerGetCapabilities: vi.fn(),
  mediaFindUrlSource: vi.fn(),
}))

vi.mock('@/common/rpcClient/background/client', () => ({
  chromeRpcClient: rpc,
}))

function answerCapabilities(answers: Record<string, SourceCapabilityAnswer>) {
  rpc.providerGetCapabilities.mockImplementation(
    async ({ providerConfigId }: { providerConfigId: string }) => ({
      data: answers[providerConfigId],
    })
  )
}

function answerUrlSource(answer: UrlParseAnswer) {
  rpc.mediaFindUrlSource.mockImplementation(async () => ({ data: answer }))
}

const canFetchDanmaku: SourceCapabilityAnswer = {
  status: 'available',
  capabilities: capabilitiesFromManifest({
    search: {},
    episodes: {},
    danmaku: {},
  }),
}

const searchOnly: SourceCapabilityAnswer = {
  status: 'available',
  capabilities: capabilitiesFromManifest({ search: {} }),
}

const removed: SourceCapabilityAnswer = { status: 'removed' }

function sourceEpisode(providerConfigId: string): GenericEpisodeLite {
  const { comments: _, ...lite } = makeEpisode()
  return { ...lite, season: makeSeason({ providerConfigId }) }
}

const customEpisode: GenericEpisodeLite = {
  id: 2,
  version: 1,
  timeUpdated: 0,
  title: 'Local file',
  commentCount: 0,
  schemaVersion: 4,
}

let root: Root | undefined
let element: HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  element = document.createElement('div')
})

afterEach(() => {
  root?.unmount()
  root = undefined
})

function render(node: React.ReactNode) {
  root = createRoot(element)
  root.render(
    <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
  )
}

function RefreshProbe({ episode }: { episode: GenericEpisodeLite }) {
  const canRefresh = useCanRefetchDanmaku(episode)
  return <span>{canRefresh ? 'refresh' : 'no refresh'}</span>
}

function UrlProbe({ text }: { text: string }) {
  const answer = useUrlParseAnswer(text)
  return (
    <span>{answer.kind === 'parseable' ? answer.sourceName : answer.kind}</span>
  )
}

describe('useCanRefetchDanmaku', () => {
  it('offers refresh for a source that can fetch danmaku', async () => {
    answerCapabilities({ bilibili: canFetchDanmaku })
    render(<RefreshProbe episode={sourceEpisode('bilibili')} />)

    await vi.waitFor(() => {
      expect(element.textContent).toBe('refresh')
    })
  })

  it('withholds refresh from a source without a danmaku pipeline', async () => {
    answerCapabilities({ lookup: searchOnly })
    render(<RefreshProbe episode={sourceEpisode('lookup')} />)

    await vi.waitFor(() => {
      expect(rpc.providerGetCapabilities).toHaveBeenCalled()
    })
    expect(element.textContent).toBe('no refresh')
  })

  it('withholds refresh once the source is deleted', async () => {
    answerCapabilities({ gone: removed })
    render(<RefreshProbe episode={sourceEpisode('gone')} />)

    await vi.waitFor(() => {
      expect(rpc.providerGetCapabilities).toHaveBeenCalled()
    })
    expect(element.textContent).toBe('no refresh')
  })

  it('never asks about a local episode', async () => {
    render(<RefreshProbe episode={customEpisode} />)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(element.textContent).toBe('no refresh')
    expect(rpc.providerGetCapabilities).not.toHaveBeenCalled()
  })
})

function AnswersProbe({ ids }: { ids: string[] }) {
  const { settled } = useSourceAnswers(ids)
  return <span>{settled ? 'settled' : 'pending'}</span>
}

describe('useSourceAnswers', () => {
  it('settles at once when the background fails to answer', async () => {
    rpc.providerGetCapabilities.mockRejectedValue(new Error('registry failed'))
    render(<AnswersProbe ids={['bilibili']} />)

    await vi.waitFor(
      () => {
        expect(element.textContent).toBe('settled')
      },
      { timeout: 500 }
    )
    expect(rpc.providerGetCapabilities).toHaveBeenCalledTimes(1)
  })
})

describe('useUrlParseAnswer', () => {
  it('names the installed source the background says parses the link', async () => {
    answerUrlSource({ kind: 'parseable', sourceName: 'Bilibili' })
    render(<UrlProbe text="https://www.bilibili.com/bangumi/play/ss1" />)

    await vi.waitFor(() => {
      expect(element.textContent).toBe('Bilibili')
    })
    expect(rpc.mediaFindUrlSource).toHaveBeenCalledWith({
      url: 'https://www.bilibili.com/bangumi/play/ss1',
    })
  })

  it('reports a link no installed source parses as unclaimed', async () => {
    answerUrlSource({ kind: 'unclaimed' })
    render(<UrlProbe text="http://localhost:8080/play/1" />)

    await vi.waitFor(() => {
      expect(element.textContent).toBe('unclaimed')
    })
  })

  it.each([
    '  ',
    'sousou no frieren',
    'frieren',
    'Re:Zero',
  ])('leaves %j as not a link without asking', async (text) => {
    render(<UrlProbe text={text} />)

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(element.textContent).toBe('notLink')
    expect(rpc.mediaFindUrlSource).not.toHaveBeenCalled()
  })
})
