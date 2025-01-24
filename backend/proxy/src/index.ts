export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) {
      console.log('Rejecting request due to origin mismatch', {
        got: request.headers.get('Origin'),
        expected: env.ALLOWED_ORIGIN,
      })

      return setCorsHeaders(
        new Response(null, { status: 400 }),
        env.ALLOWED_ORIGIN
      )
    }

    if (request.method === 'OPTIONS') {
      return setCorsHeaders(
        new Response(null, {
          status: 204,
        }),
        env.ALLOWED_ORIGIN
      )
    }

    return setCorsHeaders(
      await proxyDanDanPlay(request, env),
      env.ALLOWED_ORIGIN
    )
  },
}

const setCorsHeaders = (response: Response, origin: string) => {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

async function proxyDanDanPlay(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  const path = url.pathname.includes(env.BASE_URL)
    ? url.pathname.replace(env.BASE_URL, '')
    : url.pathname

  const targetUrl = `${env.DANDANPLAY_API_HOST}${path}${url.search}`

  console.log(`Handling DanDanPlay proxy`, {
    target: targetUrl,
    body: request.body,
  })

  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual',
  })

  newRequest.headers.set('X-AppId', env.DANDANPLAY_APP_ID)
  newRequest.headers.set('X-AppSecret', env.DANDANPLAY_APP_SECRET)

  try {
    const response = await fetch(newRequest)

    return new Response(response.body, response)
  } catch (error) {
    return new Response(
      `Error fetching from target: ${(error as Error).message}`,
      { status: 500 }
    )
  }
}
