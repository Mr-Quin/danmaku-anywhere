import { z } from 'zod'
import { getApiStore } from '../../shared/store.js'

const zUploadFileResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    result: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
])

export const uploadFile = async (
  file: File | Blob
): Promise<{ id: string }> => {
  const store = getApiStore()
  const formData = new FormData()
  formData.append('file', file)

  const url = `${store.baseUrl}/files/upload`
  const headers: Record<string, string> = {}

  if (store.daVersion) {
    headers['DA-Version'] = store.daVersion
  }
  if (store.daId) {
    headers['DA-extension-id'] = store.daId
  }
  if (store.headers) {
    Object.assign(headers, store.headers)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`)
  }

  const json = await res.json()
  const parsed = zUploadFileResponse.parse(json)

  if (!parsed.success) {
    throw new Error(parsed.error)
  }

  return parsed.result
}
