import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'
import { createTestUrl } from '@/test-utils/createTestUrl'

const IncomingRequest = Request

// The Gemini SDK posts to the AI gateway via the global `fetch`. Stubbing it
// lets the real SDK parse a real generateContent payload, so we exercise the
// service + controller + cache wiring instead of a hand-faked SDK chain.
const geminiResponse = (text: string) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: { parts: [{ text }], role: 'model' },
          finishReason: 'STOP',
          index: 0,
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )

describe('LLM API', () => {
  const extraTitleInput =
    '<meta name="emotion-insertion-point" content="">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no,viewport-fit=cover">\n<meta name="keywords" content="TV番组BanG Dream! Ave Mujica,BanG Dream! Ave Mujica第01集,BanG Dream! Ave Mujica在线观看,次元城动画 - 充满对另一个世界的无尽幻想！">\n<meta name="description" content="BanG Dream! Ave Mujica剧情介绍：「言ったでしょう？残りの人生、わたくしに下さいと」豊川祥子がメンバーを招き入れたバンド・Ave Mujicaは、ライブやメディア露出など、商業的な成功を収めていた。運命をともにする">\n<meta name="renderer" content="webkit">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<meta http-equiv="Cache-Control" content="no-siteapp">\n<meta name="referrer" content="no-referrer">\n<title>TV番组《BanG Dream! Ave Mujica》第01集在线观看-次元城动画 - 充满对另一个世界的无尽幻想!!</title>'

  const differentInput =
    '<meta name="description" content="Different anime content">\n<title>Different Anime Title</title>'

  // The Miniflare cache persists across tests (and across watch-mode re-runs)
  // and useLLMCache keys POST requests by a hash of the body, so each test must
  // use a distinct input or a prior cached response masks the LLM call count.
  // The per-run id keeps keys unique across repeated local runs too.
  const runId = Math.random().toString(36).slice(2, 8)
  const titleInput = (marker: string) =>
    `<!--${runId}-${marker}-->${extraTitleInput}`

  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn(async () => geminiResponse('{}'))
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // A Response body can only be read once, so return a fresh instance per call
  // (the cache-miss test fetches twice).
  const mockLLMResult = (result: unknown) => {
    fetchSpy.mockImplementation(async () =>
      geminiResponse(JSON.stringify(result))
    )
  }

  it('extracts title via the legacy /proxy/gemini route', async () => {
    const request = new IncomingRequest(
      'http://example.com/proxy/gemini/extractTitle',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: titleInput('legacy'),
        }),
      }
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('extracts title from HTML v2', async () => {
    mockLLMResult({
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
        input: titleInput('v2'),
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

    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toContain('max-age=')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('cache works - cache hit', async () => {
    const requestBody = JSON.stringify({
      input: titleInput('cache-hit'),
    })

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
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second identical request - should hit cache, not call the LLM again
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
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('cache works - cache miss', async () => {
    mockLLMResult({
      episode: 1,
      title: 'Title',
      isShow: true,
    })

    const request1 = new IncomingRequest(
      createTestUrl('/llm/v1/extractTitle'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: titleInput('cache-miss-a'),
        }),
      }
    )
    const response1 = await makeUnitTestRequest(request1)

    expect(response1.status).toBe(200)

    // Different input - distinct cache key, so the LLM is called again
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
    expect(fetchSpy).toHaveBeenCalledTimes(2)
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
  ])('rejects $name', async ({
    body,
    expectedStatus,
    expectsSuccessProperty,
  }) => {
    const request = new IncomingRequest(createTestUrl('/llm/v1/extractTitle'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })

    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(expectedStatus)

    if (expectsSuccessProperty) {
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
    }

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
