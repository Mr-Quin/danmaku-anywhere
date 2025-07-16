import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-tuils/makeUnitTestRequest'

const IncomingRequest = Request

describe('Repo API', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns kazumi index.json', async () => {
    // Mock the GitHub API response
    const mockKazumiData = [
      { name: 'rule1', url: 'https://example.com/rule1.json' },
      { name: 'rule2', url: 'https://example.com/rule2.json' },
    ]

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockKazumiData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    const request = new IncomingRequest(
      'http://example.com/api/v1/repo/kazumi/index.json'
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const content: any = await response.json()
    expect(content).toBeTruthy()
    expect(content.length).toBeGreaterThan(0)

    // Check that the GitHub API was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/Predidit/KazumiRules/main/index.json'
    )
  })
})
