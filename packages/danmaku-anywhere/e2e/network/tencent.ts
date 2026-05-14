import type { NetworkMock } from '../setup/profile'

export interface TencentFixtures {
  search: unknown
  episodes: unknown
  danmakuBase: unknown
  // Keyed by segment_name as returned by the danmakuBase response.
  danmakuSegments: Record<string, unknown>
}

export function mockTencent(fixtures: TencentFixtures): NetworkMock[] {
  return [
    {
      pattern:
        /pbaccess\.video\.qq\.com\/trpc\.videosearch\.mobile_search\.MultiTerminalSearch\/MbSearch/,
      respond: (route) => route.fulfill({ json: fixtures.search }),
    },
    {
      pattern:
        /pbaccess\.video\.qq\.com\/trpc\.universal_backend_service\.page_server_rpc\.PageServer\/GetPageData/,
      respond: (route) => route.fulfill({ json: fixtures.episodes }),
    },
    {
      pattern: /dm\.video\.qq\.com\/barrage\/base\//,
      respond: (route) => route.fulfill({ json: fixtures.danmakuBase }),
    },
    {
      pattern: /dm\.video\.qq\.com\/barrage\/segment\//,
      respond: (route) => {
        const pathname = new URL(route.request().url()).pathname
        const segmentName = pathname.split('/').pop() ?? ''
        const body = fixtures.danmakuSegments[segmentName]
        if (body === undefined) {
          return route.fulfill({ status: 404, body: 'no segment' })
        }
        return route.fulfill({ json: body })
      },
    },
  ]
}
