import { factory } from '@/factory'

export const rulesRouter = factory.createApp()

rulesRouter.get('/', async (c) => {
  return await fetch(
    'https://raw.githubusercontent.com/Predidit/KazumiRules/main/index.json'
  )
})

rulesRouter.get('/file', async (c) => {
  const file = c.req.query('file')
  if (!file) {
    return c.json(
      { message: 'File parameter is required', success: false },
      { status: 400 }
    )
  }

  return await fetch(
    `https://raw.githubusercontent.com/Predidit/KazumiRules/main/${file}`
  )
})
