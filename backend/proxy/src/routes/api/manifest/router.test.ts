import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestUrl } from '@/test-utils/createTestUrl'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

const dangoBaseUrl =
  'https://raw.githubusercontent.com/Mr-Quin/dango/main/packages/dango-manifests'

describe('Manifest API', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('proxies the catalog from the dango repo (GET /)', async () => {
    const mockCatalog = {
      packageVersion: '0.2.0',
      manifests: [
        {
          id: 'builtin:bilibili',
          name: 'Bilibili',
          version: '0.2.0',
          apiVersion: 1,
          file: 'src/manifests/builtin-bilibili.json',
        },
      ],
    }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockCatalog), { status: 200 })
      )

    const request = new Request(createTestUrl('/manifest'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(`${dangoBaseUrl}/catalog.json`)

    const content: any = await response.json()
    expect(content.packageVersion).toBe('0.2.0')
    expect(content.manifests.length).toBeGreaterThan(0)
  })

  it('proxies a manifest file from the dango repo (GET /file)', async () => {
    const mockManifest = { id: 'builtin:bilibili', name: 'Bilibili' }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockManifest), { status: 200 })
      )

    const request = new Request(
      createTestUrl('/manifest/file', {
        query: { file: 'src/manifests/builtin-bilibili.json' },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      `${dangoBaseUrl}/src/manifests/builtin-bilibili.json`
    )

    const content: any = await response.json()
    expect(content.id).toBe('builtin:bilibili')
  })

  it('returns 400 when file parameter is missing (GET /file)', async () => {
    const request = new Request(createTestUrl('/manifest/file'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(400)

    const content: any = await response.json()
    expect(content.success).toBe(false)
  })

  it('rejects path traversal in the file parameter (GET /file)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const request = new Request(
      createTestUrl('/manifest/file', {
        query: { file: 'src/manifests/../../../../etc/passwd.json' },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects non-manifest paths in the file parameter (GET /file)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const request = new Request(
      createTestUrl('/manifest/file', {
        query: { file: 'catalog.json' },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects absolute URLs in the file parameter (GET /file)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const request = new Request(
      createTestUrl('/manifest/file', {
        query: { file: 'https://evil.example.com/payload.json' },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
