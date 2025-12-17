import JSZip from 'jszip'
import { z } from 'zod'
import { zIntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'

export const sharedMountConfigSchema = z.object({
  patterns: z.array(z.string()),
  policy: zIntegrationPolicy.omit({ options: true }),
})

export type SharedMountConfig = z.infer<typeof sharedMountConfigSchema>

export const encodeShareConfig = async (
  config: SharedMountConfig
): Promise<string> => {
  const json = JSON.stringify(config)
  const zip = new JSZip()
  zip.file('config.json', json)
  return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' })
}

export const decodeShareConfig = async (
  code: string
): Promise<SharedMountConfig> => {
  const zip = new JSZip()
  const loadedZip = await zip.loadAsync(code, { base64: true })
  const file = loadedZip.file('config.json')

  if (!file) {
    throw new Error('Invalid share code: missing config.json')
  }

  const text = await file.async('string')
  const json = JSON.parse(text)
  return sharedMountConfigSchema.parseAsync(json)
}
