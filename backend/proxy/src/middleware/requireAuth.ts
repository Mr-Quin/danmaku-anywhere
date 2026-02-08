import { factory } from '@/factory'

export const requireAuth = () =>
  factory.createMiddleware(async (context, next) => {
    const user = context.get('authUser')
    if (!user) {
      return context.json(
        { message: 'Unauthorized', success: false },
        { status: 401 }
      )
    }
    return next()
  })
