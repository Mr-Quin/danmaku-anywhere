import { getOrCreateAuth } from '@/auth/config'
import { factory } from '@/factory'

export const authRouter = factory.createApp()

authRouter.get('/docs', async (context) => {
  const auth = await getOrCreateAuth(
    context.env,
    context.executionCtx.waitUntil
  )
  return context.json(await auth.api.generateOpenAPISchema(), { status: 200 })
})

authRouter.on(['GET', 'POST'], '/*', async (context) => {
  try {
    const auth = await getOrCreateAuth(
      context.env,
      context.executionCtx.waitUntil
    )
    return auth.handler(context.req.raw)
  } catch (error) {
    console.error('Auth not configured', error)
    return context.json(
      { message: 'Auth not configured', success: false },
      { status: 500 }
    )
  }
})
