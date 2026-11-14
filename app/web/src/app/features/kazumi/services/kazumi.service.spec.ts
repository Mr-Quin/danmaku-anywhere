import { TestBed } from '@angular/core/testing'
import {
  type KazumiPolicy,
  zKazumiPolicy,
} from '@danmaku-anywhere/extension-protocol'
import {
  provideQueryClient,
  QueryClient,
  QueryObserver,
} from '@tanstack/angular-query-experimental'
import { defer, finalize, from, type Observable, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionMessagingService } from '../../../core/extension/extension-messaging.service'
import { queryKeys } from '../../../shared/query/queryKeys'
import { KazumiService } from './kazumi.service'

/**
 * Importing a rule fetches its file and stores it for search. A rule the
 * scraper cannot run (api mode) must be refused with a reason the settings
 * panel can show next to that rule, and the reason must not bleed into
 * other rules or survive a retry of the same rule.
 */

const apiRule = {
  api: '8',
  type: 'anime',
  name: 'xfdmnext',
  version: '1.1',
  baseURL: 'https://next.xifanacg.com/',
  searchMode: 'api',
  chapterMode: 'api',
  searchURL: '',
  searchList: '',
  searchName: '',
  searchResult: '',
  chapterRoads: '',
  chapterResult: '',
  searchApiConfig: { request: { method: 'POST', url: 'https://example.com' } },
}

const brokenXPathRule = {
  api: '4',
  type: 'anime',
  name: 'broken',
  version: '1.0',
  baseURL: 'https://example.com/',
  searchURL: '',
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('KazumiService.addPolicyMutation', () => {
  let service: KazumiService
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    TestBed.configureTestingModule({
      providers: [
        provideQueryClient(
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        ),
      ],
    })
    service = TestBed.inject(KazumiService)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuses an api mode rule and records why', async () => {
    fetchMock.mockResolvedValue(jsonResponse(apiRule))

    await expect(
      service.addPolicyMutation.mutateAsync('xfdmnext')
    ).rejects.toThrow('API 模式')

    const requestedUrl = String(fetchMock.mock.calls[0][0])
    expect(requestedUrl).toContain('file=xfdmnext.json')
    expect(service.$importErrors().get('xfdmnext')).toContain('API 模式')
    expect(service.$inProgressImports().has('xfdmnext')).toBe(false)
  })

  it('keeps one reason per rule', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(apiRule))
    fetchMock.mockResolvedValueOnce(jsonResponse(brokenXPathRule))

    await expect(
      service.addPolicyMutation.mutateAsync('xfdmnext')
    ).rejects.toThrow()
    await expect(
      service.addPolicyMutation.mutateAsync('broken')
    ).rejects.toThrow()

    expect(service.$importErrors().get('xfdmnext')).toContain('API 模式')
    expect(service.$importErrors().get('broken')).toBe(
      'Schema validation failed'
    )
  })

  it("clears the rule's reason when it is imported again", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(apiRule))
    await expect(
      service.addPolicyMutation.mutateAsync('xfdmnext')
    ).rejects.toThrow()

    const neverResolves = new Promise<Response>(() => undefined)
    fetchMock.mockReturnValueOnce(neverResolves)
    service.addPolicyMutation.mutate('xfdmnext')
    await vi.waitFor(() => {
      expect(service.$inProgressImports().has('xfdmnext')).toBe(true)
    })

    expect(service.$importErrors().has('xfdmnext')).toBe(false)
  })
})

function makeXPathRule(name: string) {
  return zKazumiPolicy.parse({
    ...brokenXPathRule,
    name,
    searchURL: 'https://example.com/search?wd=@keyword',
    searchList: '//div',
    searchName: '//a',
    searchResult: '//a',
    chapterRoads: '//div',
    chapterResult: '//a',
  })
}

interface SearchPayload {
  keyword: string
  policy: KazumiPolicy
}

interface Gate {
  promise: Promise<unknown[]>
  resolve: (value: unknown[]) => void
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('KazumiService rule search', () => {
  let service: KazumiService
  let queryClient: QueryClient

  const xpathRules = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'].map(
    makeXPathRule
  )
  const parsedApiRule = zKazumiPolicy.parse(apiRule)
  const allRules = [...xpathRules, parsedApiRule]

  let active = 0
  let peak = 0
  const searchCalls: SearchPayload[] = []
  const gates = new Map<string, Gate>()

  function single(action: string, payload: SearchPayload): Observable<unknown> {
    if (action !== 'kazumiSearch') {
      return throwError(() => new Error(`unexpected action: ${action}`))
    }
    searchCalls.push(payload)
    return defer(() => {
      active++
      peak = Math.max(peak, active)
      const gate = deferred<unknown[]>()
      gates.set(payload.policy.name, gate)
      return from(gate.promise).pipe(
        finalize(() => {
          active--
        })
      )
    })
  }

  beforeEach(() => {
    active = 0
    peak = 0
    searchCalls.length = 0
    gates.clear()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    })
    queryClient.setQueryData(queryKeys.kazumi.local.all(), allRules)
    TestBed.configureTestingModule({
      providers: [
        provideQueryClient(queryClient),
        {
          provide: ExtensionMessagingService,
          useValue: { single: vi.fn(single) },
        },
      ],
    })
    service = TestBed.inject(KazumiService)
  })

  afterEach(() => {
    TestBed.resetTestingModule()
  })

  it('searches every runnable rule through the shared cap as the query changes', async () => {
    service.updateQuery('  frieren  ')
    TestBed.tick()

    await vi.waitFor(() => {
      expect(gates.size).toBe(3)
    })
    expect(searchCalls.map((call) => call.policy.name)).toEqual([
      'rule1',
      'rule2',
      'rule3',
    ])
    expect(searchCalls.map((call) => call.keyword)).toEqual([
      'frieren',
      'frieren',
      'frieren',
    ])
    expect(peak).toBe(3)

    gates.get('rule1')?.resolve([])
    gates.get('rule2')?.resolve([])
    gates.get('rule3')?.resolve([])

    await vi.waitFor(() => {
      expect(gates.size).toBe(5)
    })
    expect(peak).toBe(3)

    gates.get('rule4')?.resolve([])
    gates.get('rule5')?.resolve([])

    await vi.waitFor(() => {
      expect(active).toBe(0)
    })
    expect(searchCalls.map((call) => call.policy.name)).toEqual([
      'rule1',
      'rule2',
      'rule3',
      'rule4',
      'rule5',
    ])
    expect(searchCalls.map((call) => call.policy.name)).not.toContain(
      parsedApiRule.name
    )
  })

  it('keeps the shared cap when components subscribe their own queries', async () => {
    const observers = allRules.map((policy) => {
      return new QueryObserver(
        queryClient,
        service.getSearchQueryOptions('frieren', policy)
      )
    })
    const unsubscribes = observers.map((observer) => {
      return observer.subscribe(() => undefined)
    })

    await vi.waitFor(() => {
      expect(gates.size).toBe(3)
    })
    expect(peak).toBe(3)
    expect(searchCalls.map((call) => call.policy.name)).not.toContain(
      parsedApiRule.name
    )

    for (const call of searchCalls) {
      gates.get(call.policy.name)?.resolve([])
    }
    await vi.waitFor(() => {
      expect(gates.size).toBe(5)
    })
    for (const call of [...searchCalls]) {
      gates.get(call.policy.name)?.resolve([])
    }
    await vi.waitFor(() => {
      expect(active).toBe(0)
    })
    expect(searchCalls.map((call) => call.policy.name)).toEqual([
      'rule1',
      'rule2',
      'rule3',
      'rule4',
      'rule5',
    ])

    for (const unsubscribe of unsubscribes) {
      unsubscribe()
    }
  })

  it('uses the normalized keyword for the cache key and the search', () => {
    const options = service.getSearchQueryOptions('  frieren  ', xpathRules[0])

    expect(options.queryKey).toEqual(
      queryKeys.kazumi.search('rule1', 'frieren')
    )
  })

  it('searches an xpath rule once there is a keyword', () => {
    expect(
      service.getSearchQueryOptions('frieren', xpathRules[0]).enabled
    ).toBe(true)
  })

  it('never searches a rule the scraper cannot run', () => {
    expect(
      service.getSearchQueryOptions('frieren', parsedApiRule).enabled
    ).toBe(false)
  })

  it('waits for a keyword', () => {
    expect(service.getSearchQueryOptions('   ', xpathRules[0]).enabled).toBe(
      false
    )
  })
})
