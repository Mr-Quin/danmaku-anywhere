import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { decodeShareConfig } from './shareSchema'

async function zipOf(files: Record<string, string>): Promise<string> {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content)
  }
  return zip.generateAsync({ type: 'base64' })
}

describe('decodeShareConfig', () => {
  it.each([
    ['not a zip', async () => '@@not base64@@'],
    ['a zip without config.json', () => zipOf({ 'other.json': '{}' })],
    ['config.json that is not JSON', () => zipOf({ 'config.json': '{' })],
    [
      'config.json with the wrong shape',
      () => zipOf({ 'config.json': '{"name":1}' }),
    ],
  ])('rejects %s as an invalid share code', async (_, makeCode) => {
    await expect(decodeShareConfig(await makeCode())).rejects.toMatchObject({
      code: 'shareCode.invalid',
    })
  })
})
