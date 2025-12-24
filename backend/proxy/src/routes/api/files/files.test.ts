import { describe, expect, it } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'
import { env } from 'cloudflare:test'
import { createTestUrl } from '@/test-utils/createTestUrl'

const IncomingRequest = Request

describe('Files API', () => {
  it('uploads a zip file successfully', async () => {
    const fileContent = new Uint8Array([1, 2, 3, 4])
    const file = new File([fileContent], 'test.zip', {
      type: 'application/zip',
    })
    const formData = new FormData()
    formData.append('file', file)

    const request = new IncomingRequest(createTestUrl('/files/upload'), {
      method: 'POST',
      headers: {
        'da-extension-id': 'test-client-id',
      },
      body: formData,
    })

    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(200)

    const data: any = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('result')
    expect(data.result).toHaveProperty('id')

    // Verify file is in R2
    const key = `debug-dumps/${data.result.id}.zip`
    const savedObject = await env.FILES_BUCKET.get(key)
    expect(savedObject).not.toBeNull()

    // https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#isolated-storage
    await savedObject?.text()
  })

  it('rejects non-zip files', async () => {
    const file = new File(['text content'], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', file)

    const request = new IncomingRequest(createTestUrl('/files/upload'), {
      method: 'POST',
      headers: {
        'da-extension-id': 'test-client-id',
      },
      body: formData,
    })

    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(400)
    const data: any = await response.json()
    expect(data).toHaveProperty('success', false)
  })

  it('rejects empty files', async () => {
    const file = new File([], 'empty.zip', { type: 'application/zip' })
    const formData = new FormData()
    formData.append('file', file)

    const request = new IncomingRequest(createTestUrl('/files/upload'), {
      method: 'POST',
      headers: {
        'da-extension-id': 'test-client-id',
      },
      body: formData,
    })

    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(400)
    const data: any = await response.json()
    expect(data).toHaveProperty('success', false)
  })

  it('rejects request without client id', async () => {
    const file = new File(['content'], 'test.zip', { type: 'application/zip' })
    const formData = new FormData()
    formData.append('file', file)

    const request = new IncomingRequest(createTestUrl('/files/upload'), {
      method: 'POST',
      // No headers
      body: formData,
    })

    const response = await makeUnitTestRequest(request)
    expect(response.status).toBe(400)
    const data: any = await response.json()
    expect(data).toHaveProperty('success', false)
    expect(data.message).toBe('Missing client id')
  })
})
