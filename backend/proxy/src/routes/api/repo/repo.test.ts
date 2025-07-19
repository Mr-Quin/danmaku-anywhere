import { fetchMock } from 'cloudflare:test'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestUrl } from '@/test-utils/createTestUrl'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('Repo API', () => {
  beforeAll(() => {
    fetchMock.activate()
    fetchMock.disableNetConnect()
  })

  afterEach(() => fetchMock.assertNoPendingInterceptors())

  it('returns kazumi index.json', async () => {
    const mockKazumiData = [
      { name: 'rule1', url: 'https://example.com/rule1.json' },
      { name: 'rule2', url: 'https://example.com/rule2.json' },
    ]

    fetchMock
      .get('https://raw.githubusercontent.com')
      .intercept({ path: '/Predidit/KazumiRules/main/index.json' })
      .reply(200, JSON.stringify(mockKazumiData))

    const request = new Request(createTestUrl('/v1/repo/kazumi/index.json'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const content: any = await response.json()
    expect(content).toBeTruthy()
    expect(content.length).toBeGreaterThan(0)
  })
})
