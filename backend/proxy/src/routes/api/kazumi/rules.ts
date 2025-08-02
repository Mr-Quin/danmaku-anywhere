import { factory } from '@/factory'

export const rulesRouter = factory.createApp()

// GET / for the manifest file (index.json)
rulesRouter.get('/', async (c) => {
  return await fetch(
    'https://raw.githubusercontent.com/Predidit/KazumiRules/main/index.json'
  )
})

// GET /file for other files
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
