import JSZip from 'jszip'
import { z } from 'zod'
import { zIntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { tryCatch, tryCatchSync } from '@/common/utils/tryCatch'

export const sharedMountConfigSchema = z.object({
  patterns: z.array(z.string()),
  name: z.string(),
  policy: zIntegrationPolicy.omit({ options: true }),
})

export type SharedMountConfig = z.infer<typeof sharedMountConfigSchema>

export const encodeShareConfig = async (
  config: SharedMountConfig
): Promise<string> => {
  const json = JSON.stringify(config)
  const zip = new JSZip()
  zip.file('config.json', json)
  const [code, error] = await tryCatch(() =>
    zip.generateAsync({ type: 'base64', compression: 'DEFLATE' })
  )

  if (error) {
    throw new Error('Failed to generate share code: ' + error.message)
  }

  return code
}

export const decodeShareConfig = async (
  code: string
): Promise<SharedMountConfig> => {
  const zip = new JSZip()
  const [loadedZip, error] = await tryCatch(() =>
    zip.loadAsync(code, { base64: true })
  )

  if (error) {
    throw new Error('Invalid share code: ' + error.message)
  }

  const file = loadedZip.file('config.json')

  if (!file) {
    throw new Error('Invalid share code: missing config.json')
  }

  const text = await file.async('string')

  const [json, err] = tryCatchSync(() => JSON.parse(text))

  if (err) {
    throw new Error('Invalid share code: ' + err.message)
  }

  return sharedMountConfigSchema.parseAsync(json)
}
