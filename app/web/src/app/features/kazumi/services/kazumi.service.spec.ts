import { TestBed } from '@angular/core/testing'
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
