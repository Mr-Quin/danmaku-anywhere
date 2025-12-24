import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireClientId } from '@/middleware/requireClientId'

export const filesRouter = new Hono<{ Bindings: Env }>()

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function getFileExtension(file: File) {
  const parts = file.name.split('.')
  if (parts.length <= 1 && !file.name.startsWith('.')) {
    return ''
  }
  return parts.pop() ?? ''
}

filesRouter.post(
  '/upload',
  requireClientId,
  zValidator(
    'form',
    z.object({
      file: z
        .instanceof(File)
        .refine((file) => file.type === 'application/zip', {
          message: 'File must be a zip file',
        })
        .refine((file) => file.size > 0, {
          message: 'File is empty',
        })
        .refine((file) => file.size <= MAX_FILE_SIZE, {
          message: `File size must be less than ${MAX_FILE_SIZE >> 20}MB`,
        }),
    })
  ),
  async (c) => {
    const { file } = c.req.valid('form')

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
