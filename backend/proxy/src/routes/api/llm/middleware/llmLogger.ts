import * as Sentry from '@sentry/cloudflare'
import { factory } from '@/factory'

export const useLLMLogger = factory.createMiddleware(async (c, next) => {
  const input = await c.req.text()
  console.log('[LLM Input]', input)
  Sentry.addBreadcrumb({
    category: 'llm.input',
    message: 'Received LLM input',
    data: { input },
  })
  await next()
  if (!c.res || c.res.status !== 200) {
    return
  }
  const output = await c.res.clone().json()
  console.log('[LLM Output]', output)
  Sentry.addBreadcrumb({
    category: 'llm.output',
    message: 'Send LLM output',
    data: { output },
  })
})
