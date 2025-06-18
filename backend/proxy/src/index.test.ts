import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { unstable_startWorker } from 'wrangler'
import wrangler from '../wrangler.json' with { type: 'json' }

const URL = 'http://127.0.0.1:8787'
const ALLOWED_ORIGIN = wrangler.vars.ALLOWED_ORIGIN

describe('Integration testing', { timeout: 10000 }, () => {
  let worker: Awaited<ReturnType<typeof unstable_startWorker>>

  beforeAll(async () => {
    worker = await unstable_startWorker({
      config: 'wrangler.json',
    })
  })

  test('404', async () => {
    expect((await fetch(`${URL}`)).status).toBe(404)
  })

  test('cors', async () => {
    const response = await fetch(`${URL}`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
      },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      ALLOWED_ORIGIN
    )
  })

  describe('DanDanPlay API', () => {
    test('GET proxy', async () => {
      const response = await fetch(
        `${URL}/api/v1/ddp/v2/search/anime?keyword=nichijou`
      )
      expect(response.status).toBe(200)
      const data: any = await response.json()
      expect(data).toHaveProperty('animes')
      expect(data.animes.length).toBeGreaterThan(0)

      // check caching
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeDefined()
      expect(cacheControl).toContain('s-maxage=')
      expect(response.headers.get('Cf-Cache-Status')).toBeNull()

      // second request
      const res2 = await fetch(
        `${URL}/api/v1/ddp/v2/search/anime?keyword=nichijou`
      )
      expect(res2.headers.get('Cf-Cache-Status')).toBe('HIT')

      expect(data).toEqual(await res2.json())
    })

    test('GET invalid', async () => {
      const response = await fetch(`${URL}/api/ddp/invalid`)
      expect(response.status).toBe(404)
    })
  })

  describe('LLM API', () => {
    const extraTitleInput =
      '<meta name="emotion-insertion-point" content="">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no,viewport-fit=cover">\n<meta name="keywords" content="TV番组BanG Dream! Ave Mujica,BanG Dream! Ave Mujica第01集,BanG Dream! Ave Mujica在线观看,次元城动画 - 充满对另一个世界的无尽幻想！">\n<meta name="description" content="BanG Dream! Ave Mujica剧情介绍：「言ったでしょう？残りの人生、わたくしに下さいと」豊川祥子がメンバーを招き入れたバンド・Ave Mujicaは、ライブやメディア露出など、商業的な成功を収めていた。運命をともにする">\n<meta name="renderer" content="webkit">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<meta http-equiv="Cache-Control" content="no-siteapp">\n<meta name="referrer" content="no-referrer">\n<title>TV番组《BanG Dream! Ave Mujica》第01集在线观看-次元城动画 - 充满对另一个世界的无尽幻想!!</title>'

    test('POST extractTitle legacy', async () => {
      const response = await fetch(`${URL}/proxy/gemini/extractTitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: extraTitleInput,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
    })

    test('POST extractTitle', async () => {
      const response = await fetch(`${URL}/api/v1/llm/extractTitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: extraTitleInput,
        }),
      })

      expect(response.status).toBe(200)
      const data: any = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data.result).toMatchObject({
        episode: 1,
        title: 'BanG Dream! Ave Mujica',
        isShow: true,
      })

      // check caching
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeDefined()
      expect(cacheControl).toContain('max-age=')
      expect(response.headers.get('Cf-Cache-Status')).toBeNull()

      // second request
      const res2 = await fetch(`${URL}/api/v1/llm/extractTitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: extraTitleInput,
        }),
      })
      expect(res2.headers.get('Cf-Cache-Status')).toBe('HIT')

      expect(data).toEqual(await res2.json())
    })

    test('Input too short', async () => {
      const response = await fetch(`${URL}/api/v1/llm/extractTitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'short',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
    })

    test('Input too long', async () => {
      const response = await fetch(`${URL}/api/v1/llm/extractTitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'long'.repeat(5000),
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
    })

    test('Bad input', async () => {
      const response = await fetch(`${URL}/api/v1/llm/extractTitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{bad json}',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Repo API', () => {
    test('GET /kazumi', async () => {
      const response = await fetch(`${URL}/api/v1/repo/kazumi/index.json`)

      expect(response.status).toBe(200)

      const content: any = await response.json()
      expect(content).toBeTruthy()
      expect(content.length).toBeGreaterThan(0)
    })
  })

  afterAll(async () => {
    await worker.dispose()
  })
})
