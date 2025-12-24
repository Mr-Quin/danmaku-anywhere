import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

export const filesRouter = new Hono<{ Bindings: Env }>()

function getFileExtension(file: File) {
  return file.name.split('.').pop()
}

filesRouter.post(
  '/upload',
  zValidator(
    'form',
    z.object({
      file: z.instanceof(File),
    })
  ),
  async (c) => {
    const { file } = c.req.valid('form')

    const clientId = c.req.header('da-extension-id')

    if (!clientId) {
      return c.json({
        success: false,
        error: 'Missing client id',
      })
    }

    const id = crypto.randomUUID()
    const key = `debug-dumps/${id}.${getFileExtension(file)}`

    // no pre-signed url through binding? :(
    await c.env.FILES_BUCKET.put(key, file)

    return c.json({
      success: true,
      result: {
        id,
      },
    })
  }
)
