import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_ROOT = path.join(here, '..', 'fixtures')

const CONTENT_TYPES: Record<string, string> = {
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
}

/**
 * Serve a local media fixture (with HTTP Range support) at `url` via page.route
 * so a <video> can actually decode frames in e2e. The occlusion capture loop is
 * driven by requestVideoFrameCallback, which only fires for real composited
 * frames, so a src-less video is not enough. Path is relative to e2e/fixtures
 * (e.g. 'media/sample-motion.webm').
 */
export async function routeMedia(
  page: Page,
  url: string,
  fixtureRelPath: string
): Promise<void> {
  const file = readFileSync(path.join(FIXTURES_ROOT, fixtureRelPath))
  const contentType =
    CONTENT_TYPES[path.extname(fixtureRelPath)] ?? 'application/octet-stream'

  await page.route(url, async (route) => {
    const range = route.request().headers().range
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range)
      const start = match ? Number(match[1]) : 0
      const end = match?.[2] ? Number(match[2]) : file.length - 1
      const chunk = file.subarray(start, end + 1)
      await route.fulfill({
        status: 206,
        headers: {
          'content-type': contentType,
          'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${file.length}`,
          'content-length': String(chunk.length),
        },
        body: chunk,
      })
      return
    }
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': contentType,
        'accept-ranges': 'bytes',
        'content-length': String(file.length),
      },
      body: file,
    })
  })
}
