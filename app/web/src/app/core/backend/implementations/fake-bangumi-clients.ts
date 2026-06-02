import type { Provider } from '@angular/core'
import {
  BANGUMI_CLIENT,
  BANGUMI_NEXT_CLIENT,
  type BangumiClient,
  type BangumiNextClient,
} from '../bangumi-clients'
import { FakeBackendRecorder } from '../fake-backend-recorder'
import { fakeLatencyMs, shouldFail } from '../fake-control'
import {
  fakeCalendar,
  fakeCharactersPage,
  fakeCommentsPage,
  fakeEpisodesPage,
  fakeRecsPage,
  fakeRelationsPage,
  fakeReviewsPage,
  fakeSearch,
  fakeStaffPersonsPage,
  fakeSubject,
  fakeTopicsPage,
  fakeTrendingPage,
} from '../fixtures/bangumi-fixtures'

interface NextOpts {
  params?: {
    path?: { subjectID?: number }
    query?: Record<string, unknown>
  }
}

interface SearchOpts {
  body?: { keyword?: string }
}

function delayMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function subjectIdOf(opts?: NextOpts): number {
  return opts?.params?.path?.subjectID ?? 0
}

function resolveNext(path: string, opts?: NextOpts): unknown {
  const subjectId = subjectIdOf(opts)
  switch (path) {
    case '/p1/calendar':
      return fakeCalendar
    case '/p1/trending/subjects':
      return fakeTrendingPage()
    case '/p1/subjects/{subjectID}':
      return fakeSubject(subjectId)
    case '/p1/subjects/{subjectID}/episodes':
      return fakeEpisodesPage(subjectId)
    case '/p1/subjects/{subjectID}/characters':
      return fakeCharactersPage(subjectId)
    case '/p1/subjects/{subjectID}/relations':
      return fakeRelationsPage(subjectId)
    case '/p1/subjects/{subjectID}/staffs/persons':
      return fakeStaffPersonsPage(subjectId)
    case '/p1/subjects/{subjectID}/recs':
      return fakeRecsPage(subjectId)
    case '/p1/subjects/{subjectID}/reviews':
      return fakeReviewsPage()
    case '/p1/subjects/{subjectID}/topics':
      return fakeTopicsPage()
    case '/p1/subjects/{subjectID}/comments':
      return fakeCommentsPage()
    default:
      throw new Error(`fake bgm-next GET unhandled: ${path}`)
  }
}

function makeFakeNextClient(recorder: FakeBackendRecorder): BangumiNextClient {
  const GET = async (path: string, opts?: NextOpts) => {
    if (shouldFail(path)) {
      recorder.record({
        channel: 'bangumi',
        action: path,
        argsSummary: String(subjectIdOf(opts)),
        ok: false,
      })
      throw new Error(`fake bgm-next failure: ${path}`)
    }
    await delayMs(fakeLatencyMs())
    const data = resolveNext(path, opts)
    recorder.record({
      channel: 'bangumi',
      action: path,
      argsSummary: String(subjectIdOf(opts)),
      ok: true,
    })
    return { data }
  }
  return { GET } as unknown as BangumiNextClient
}

function makeFakeClient(recorder: FakeBackendRecorder): BangumiClient {
  const POST = async (path: string, opts?: SearchOpts) => {
    if (path !== '/v0/search/subjects') {
      throw new Error(`fake bgm POST unhandled: ${path}`)
    }
    if (shouldFail(path)) {
      recorder.record({
        channel: 'bangumi',
        action: path,
        argsSummary: opts?.body?.keyword ?? '',
        ok: false,
      })
      throw new Error(`fake bgm failure: ${path}`)
    }
    await delayMs(fakeLatencyMs())
    const data = fakeSearch(opts?.body?.keyword ?? '')
    recorder.record({
      channel: 'bangumi',
      action: path,
      argsSummary: opts?.body?.keyword ?? '',
      ok: true,
    })
    return { data }
  }
  return { POST } as unknown as BangumiClient
}

export const fakeBangumiProviders: Provider[] = [
  {
    provide: BANGUMI_NEXT_CLIENT,
    useFactory: makeFakeNextClient,
    deps: [FakeBackendRecorder],
  },
  {
    provide: BANGUMI_CLIENT,
    useFactory: makeFakeClient,
    deps: [FakeBackendRecorder],
  },
]
