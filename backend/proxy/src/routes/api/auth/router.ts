import { getOrCreateAuth } from '@/auth/config'
import { factory } from '@/factory'

export const authRouter = factory.createApp()

authRouter.get('/reference/openapi.json', async (context) => {
  const auth = await getOrCreateAuth(context.env)
  return context.json(await auth.api.generateOpenAPISchema(), { status: 200 })
})

authRouter.on(['GET', 'POST'], '/*', async (context) => {
  try {
    const auth = await getOrCreateAuth(context.env)
    return auth.handler(context.req.raw)
  } catch (error) {
    console.error('Auth not configured', error)
    return context.json(
      { message: 'Auth not configured', success: false },
      { status: 500 }
    )
  }
})
