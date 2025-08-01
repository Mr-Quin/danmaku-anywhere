import type { GoogleGenerativeAI } from '@google/generative-ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'
import { createTestUrl } from '@/test-utils/createTestUrl'

const IncomingRequest = Request

// Mock the Google Generative AI package
const mockSendMessage = vi.fn()
const mockStartChat = vi.fn(() => ({
  sendMessage: mockSendMessage,
}))
const mockGetGenerativeModel = vi.fn(() => ({
  startChat: mockStartChat,
}))
const mockGoogleGenerativeAI = vi.hoisted(
  () =>
    vi.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })) as unknown as typeof GoogleGenerativeAI
)

vi.mock(import('@google/generative-ai'), async (importOriginal) => {
  const original = await importOriginal()

  return {
    ...original,
    GoogleGenerativeAI: mockGoogleGenerativeAI,
    GoogleGenerativeAIFetchError: class extends Error {
      constructor(
        message: string,
        public status?: number,
        public errorDetails?: any
      ) {
        super(message)
      }
    },
  }
})

describe('LLM API', () => {
  const extraTitleInput =
    '<meta name="emotion-insertion-point" content="">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no,viewport-fit=cover">\n<meta name="keywords" content="TV番组BanG Dream! Ave Mujica,BanG Dream! Ave Mujica第01集,BanG Dream! Ave Mujica在线观看,次元城动画 - 充满对另一个世界的无尽幻想！">\n<meta name="description" content="BanG Dream! Ave Mujica剧情介绍：「言ったでしょう？残りの人生、わたくしに下さいと」豊川祥子がメンバーを招き入れたバンド・Ave Mujicaは、ライブやメディア露出など、商業的な成功を収めていた。運命をともにする">\n<meta name="renderer" content="webkit">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<meta http-equiv="Cache-Control" content="no-siteapp">\n<meta name="referrer" content="no-referrer">\n<title>TV番组《BanG Dream! Ave Mujica》第01集在线观看-次元城动画 - 充满对另一个世界的无尽幻想!!</title>'

  const differentInput =
    '<meta name="description" content="Different anime content">\n<title>Different Anime Title</title>'

  beforeEach(() => {
    // Clear cache before each test
    vi.clearAllMocks()
    vi.resetAllMocks()
  })

  afterEach(() => {})

  const mockLLMResponse = (response: any) => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => JSON.stringify(response),
      },
    })
  }

  it('extracts title from HTML v1', async () => {
    mockLLMResponse({})

    const request = new IncomingRequest(
      'http://example.com/proxy/gemini/extractTitle',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: extraTitleInput,
        }),
      }
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
  })

  it('extracts title from HTML v2', async () => {
    mockLLMResponse({
      episode: 1,
      title: 'BanG Dream! Ave Mujica',
      isShow: true,
    })

    const request = new IncomingRequest(createTestUrl('/llm/v1/extractTitle'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: extraTitleInput,
      }),
    })
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    const data: any = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data.result).toMatchObject({
      episode: 1,
      title: 'BanG Dream! Ave Mujica',
      isShow: true,
    })

    // Check caching headers
    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBeDefined()
    expect(cacheControl).toContain('max-age=')
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
  })

  it('cache works - cache hit', async () => {
    // Mock response for the initial request
    mockLLMResponse({})

    const requestBody = JSON.stringify({
      input: extraTitleInput,
    })

    // First request - should call LLM
    const request1 = new IncomingRequest(
      createTestUrl('/llm/v1/extractTitle'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }
    )
    const response1 = await makeUnitTestRequest(request1)

    expect(response1.status).toBe(200)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)

    // Second identical request - should hit cache, not call LLM again
    const request2 = new IncomingRequest(
      createTestUrl('/llm/v1/extractTitle'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }
    )
    const response2 = await makeUnitTestRequest(request2)

    expect(response2.status).toBe(200)

    // Should be called once since the second request hits the cache
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
  })

  it('cache works - cache miss', async () => {
    // Mock responses for both requests
    mockLLMResponse({
      episode: 1,
      title: 'Title',
      isShow: true,
    })

    // First request
    const request1 = new IncomingRequest(
      createTestUrl('/llm/v1/extractTitle'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: extraTitleInput,
        }),
      }
    )
    const response1 = await makeUnitTestRequest(request1)

    expect(response1.status).toBe(200)

    // Second request with different input
    const request2 = new IncomingRequest(
      createTestUrl('/llm/v1/extractTitle'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: differentInput,
        }),
      }
    )
    const response2 = await makeUnitTestRequest(request2)

    expect(response2.status).toBe(200)

    // Should be called twice since inputs are different
    expect(mockSendMessage).toHaveBeenCalledTimes(2)
  })

  it.each([
    {
      name: 'input too short',
      body: JSON.stringify({ input: 'short' }),
      expectedStatus: 400,
      expectsSuccessProperty: true,
    },
    {
      name: 'input too long',
      body: JSON.stringify({ input: 'long'.repeat(5000) }),
      expectedStatus: 400,
      expectsSuccessProperty: true,
    },
    {
      name: 'malformed JSON',
      body: '{bad json}',
      expectedStatus: 400,
      expectsSuccessProperty: false,
    },
    {
      name: 'missing input field',
      body: JSON.stringify({ notInput: 'valid length string' }),
      expectedStatus: 400,
      expectsSuccessProperty: true,
    },
    {
      name: 'empty input',
      body: JSON.stringify({ input: '' }),
      expectedStatus: 400,
      expectsSuccessProperty: true,
    },
  ])(
    'rejects $name',
    async ({ body, expectedStatus, expectsSuccessProperty }) => {
      const request = new IncomingRequest(
        createTestUrl('/llm/v1/extractTitle'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        }
      )

      const response = await makeUnitTestRequest(request)

      expect(response.status).toBe(expectedStatus)

      if (expectsSuccessProperty) {
        const data = await response.json()
        expect(data).toHaveProperty('success', false)
      }

      expect(mockSendMessage).not.toHaveBeenCalled()
    }
  )
})
