import { fetchMock } from 'cloudflare:test'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestUrl } from '@/test-utils/createTestUrl'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('Kazumi Rules API', () => {
  beforeAll(() => {
    fetchMock.activate()
    fetchMock.disableNetConnect()
  })

  afterEach(() => fetchMock.assertNoPendingInterceptors())

  it('returns kazumi manifest file (GET /)', async () => {
    const mockKazumiData = [
      { name: 'rule1', url: 'https://example.com/rule1.json' },
      { name: 'rule2', url: 'https://example.com/rule2.json' },
    ]

    fetchMock
      .get('https://raw.githubusercontent.com')
      .intercept({ path: '/Predidit/KazumiRules/main/index.json' })
      .reply(200, JSON.stringify(mockKazumiData))

    const request = new Request(createTestUrl('/kazumi/rules'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const content: any = await response.json()
    expect(content).toBeTruthy()
    expect(content.length).toBeGreaterThan(0)
  })

  it('returns specific rule file (GET /file)', async () => {
    const mockRuleData = { name: 'test-rule', patterns: ['.*'] }

    fetchMock
      .get('https://raw.githubusercontent.com')
      .intercept({ path: '/Predidit/KazumiRules/main/test-rule.json' })
      .reply(200, JSON.stringify(mockRuleData))

    const request = new Request(createTestUrl('/kazumi/rules/file?file=test-rule.json'))
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
    expect(content.message).toBe('File parameter is required')
    expect(content.success).toBe(false)
  })
})