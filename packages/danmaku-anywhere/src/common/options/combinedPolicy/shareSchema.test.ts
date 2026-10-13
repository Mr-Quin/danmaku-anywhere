import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import {
  decodeShareConfig,
  encodeShareConfig,
  InvalidShareCodeError,
  type SharedMountConfig,
} from './shareSchema'

/**
 * Share codes round-trip through encode and decode, tolerate surrounding
 * whitespace from a paste, and anything that is not a share code (bad
 * base64, a zip without the config, unparsable or wrong-shaped JSON) fails
 * with InvalidShareCodeError so the UI can tell it apart from other errors.
 */

const emptyMatcher = { selector: [], regex: [] }

const config: SharedMountConfig = {
  name: 'Example',
  patterns: ['https://example.com/*'],
  policy: {
    version: 3,
    title: { selector: [{ value: '//h1', quick: false }], regex: [] },
    episode: emptyMatcher,
    season: emptyMatcher,
    episodeTitle: emptyMatcher,
  },
}

async function zipBase64(files: Record<string, string>): Promise<string> {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content)
  }
  return zip.generateAsync({ type: 'base64' })
}

describe('decodeShareConfig', () => {
  it('round-trips an encoded config, ignoring surrounding whitespace', async () => {
    const code = await encodeShareConfig(config)

    const decoded = await decodeShareConfig(`\n  ${code}  \n`)

    expect(decoded.name).toBe('Example')
    expect(decoded.patterns).toEqual(['https://example.com/*'])
  })

  it.each([
    ['text that is not base64', async () => 'not a share code'],
    ['a zip without config.json', () => zipBase64({ 'other.json': '{}' })],
    ['unparsable JSON', () => zipBase64({ 'config.json': '{' })],
    ['JSON of the wrong shape', () => zipBase64({ 'config.json': '{"a":1}' })],
  ])('rejects %s as an invalid share code', async (_, makeCode) => {
    await expect(decodeShareConfig(await makeCode())).rejects.toBeInstanceOf(
      InvalidShareCodeError
    )
  })
})
