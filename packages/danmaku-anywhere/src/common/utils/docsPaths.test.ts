import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOCS_PATHS } from './docsPaths'

/**
 * Every docs path the extension links to resolves to a page in the docs site
 * source, and a path with an anchor points at a heading on that page.
 */

const DOCS_CONTENT = resolve(__dirname, '../../../../../docs/src/content/docs')

function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

describe('DOCS_PATHS', () => {
  it.each(Object.entries(DOCS_PATHS))('%s resolves to a page', (_, path) => {
    const [page, anchor] = path.split('#')
    const file = resolve(DOCS_CONTENT, `${page.replace(/\/$/, '')}.mdx`)
    expect(existsSync(file)).toBe(true)

    if (anchor !== undefined) {
      const slugs = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('#'))
        .map((line) => headingSlug(line.replace(/^#+/, '')))
      expect(slugs).toContain(anchor)
    }
  })
})
