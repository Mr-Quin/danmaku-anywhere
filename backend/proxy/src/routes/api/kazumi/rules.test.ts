import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestUrl } from '@/test-utils/createTestUrl'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('Kazumi Rules API', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns kazumi manifest file (GET /)', async () => {
    const mockKazumiData = [
      { name: 'rule1', url: 'https://example.com/rule1.json' },
      { name: 'rule2', url: 'https://example.com/rule2.json' },
    ]

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockKazumiData), { status: 200 })
    )

    const request = new Request(createTestUrl('/kazumi/rules'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const content: any = await response.json()
    expect(content).toBeTruthy()
    expect(content.length).toBeGreaterThan(0)
  })

  it('returns specific rule file (GET /file)', async () => {
    const mockRuleData = { name: 'test-rule', patterns: ['.*'] }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockRuleData), { status: 200 })
    )

    const request = new Request(
      createTestUrl('/kazumi/rules/file?file=test-rule.json')
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const content: any = await response.json()
    expect(content).toBeTruthy()
    expect(content.name).toBe('test-rule')
  })

  it('returns 400 when file parameter is missing (GET /file)', async () => {
    const request = new Request(createTestUrl('/kazumi/rules/file'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(400)

    const content: any = await response.json()
    expect(content.success).toBe(false)
  })

  it('rejects path traversal and encoded bypass attempts (GET /file)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'))

    const maliciousFiles = [
      '../../../etc/passwd',
      '..%2f..%2f..%2fetc%2fpasswd',
      '/etc/passwd',
      'https://evil.com/malicious.json',
    ]

    for (const file of maliciousFiles) {
      const request = new Request(
        createTestUrl(`/kazumi/rules/file?file=${file}`)
      )
      const response = await makeUnitTestRequest(request)

      expect(response.status).toBe(400)
    }

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
