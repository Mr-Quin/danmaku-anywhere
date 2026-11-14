import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getManifest, getPolicy } from './kazumi-api'

const BASE = 'https://api.example.test'

const manifest = {
  name: 'dlma',
  version: '1.0',
  useNativePlayer: false,
  author: 'someone',
  lastUpdate: 1700000000000,
}

const policy = {
  api: '1',
  type: 'anime',
  name: 'dlma',
  version: '1.0',
  baseURL: 'https://dlma.example/',
  searchURL: 'https://dlma.example/search?q=@keyword',
  searchList: '//li',
  searchName: './/a',
  searchResult: './/a/@href',
  chapterRoads: '//ul',
  chapterResult: './/a',
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('kazumi-api', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the manifest with a plain GET and no extension headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse([manifest]))

    const result = await getManifest(BASE)

    expect(result).toEqual({ success: true, data: [manifest] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/kazumi/rules`)
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(new Headers(init.headers).has('DA-Version')).toBe(false)
    expect(new Headers(init.headers).has('DA-extension-id')).toBe(false)
  })

  it('encodes the policy file name as a query parameter', async () => {
    fetchMock.mockResolvedValue(jsonResponse(policy))

    await getPolicy(BASE, 'a b&c/d.json')

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${BASE}/kazumi/rules/file?file=a+b%26c%2Fd.json`
    )
  })

  it('fills in policy defaults, keeping the muliSources spelling', async () => {
    fetchMock.mockResolvedValue(jsonResponse(policy))

    const result = await getPolicy(BASE, 'dlma.json')

    expect(result).toEqual({
      success: true,
      data: {
        ...policy,
        muliSources: false,
        useWebview: false,
        useNativePlayer: false,
        usePost: false,
        useLegacyParser: false,
        userAgent: '',
        referer: '',
        searchMode: 'xpath',
        chapterMode: 'xpath',
      },
    })
  })

  it('uses X-Error-Message for failed responses and keeps the body', async () => {
    fetchMock.mockResolvedValue(
      new Response('no such rule', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'X-Error-Message': 'rule missing' },
      })
    )

    const result = await getPolicy(BASE, 'x.json')

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.message).toBe(
      'Request failed with status 404: Not Found rule missing'
    )
    expect(result.error.status).toBe(404)
    expect(result.error.statusText).toBe('Not Found')
    expect(result.error.responseBody).toBe('no such rule')
    expect(result.error.url).toBe(`${BASE}/kazumi/rules/file?file=x.json`)
  })

  it('falls back to the status text when there is no error header', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { status: 500, statusText: 'Internal Server Error' })
    )

    const result = await getManifest(BASE)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.message).toBe(
      'Request failed with status 500: Internal Server Error Internal Server Error'
    )
  })

  it('treats status 400 as a failure', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { status: 400, statusText: 'Bad Request' })
    )

    const result = await getManifest(BASE)

    expect(result.success).toBe(false)
  })

  it('reports network failures as status 0 Network Error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await getManifest(BASE)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.message).toBe('Failed to fetch')
    expect(result.error.status).toBe(0)
    expect(result.error.statusText).toBe('Network Error')
  })

  it('reports an undecodable body as status 0 Network Error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))

    const result = await getManifest(BASE)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.status).toBe(0)
    expect(result.error.statusText).toBe('Network Error')
  })

  it('reports a body that does not match the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ name: 'dlma' }]))

    const result = await getManifest(BASE)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.message).toBe('Schema validation failed')
    expect(result.error.status).toBeUndefined()
    expect(result.error.responseBody).toEqual([{ name: 'dlma' }])
  })
})
