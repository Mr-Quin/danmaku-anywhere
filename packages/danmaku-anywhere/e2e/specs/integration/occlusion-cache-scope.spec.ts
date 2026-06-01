import type { BrowserContext, Frame, Page } from '@playwright/test'
import { expect, test } from '../../setup/fixtures'

/**
 * Guards a load-bearing assumption of the occlusion model cache: OPFS inside the
 * extension-origin segmenter iframe must be shared across top-level sites, so a
 * large model is downloaded once globally rather than re-fetched per host site.
 * Writes a sentinel via the extension iframe embedded under site A and asserts
 * it is visible via the same extension iframe embedded under a different
 * top-level site B. A failure here means Chrome started partitioning extension
 * frames and the cache must move to the (unpartitioned) background worker.
 */

const SENTINEL = 'occlusion-cache-scope-probe.txt'

function pageHtml(extensionId: string): string {
  return `<!doctype html><meta charset="utf-8"><title>probe</title><iframe id="ext" src="chrome-extension://${extensionId}/pages/segmenter.html"></iframe>`
}

async function openWithExtIframe(
  context: BrowserContext,
  extensionId: string,
  origin: string
): Promise<Frame> {
  const page = await context.newPage()
  const url = `${origin}/`
  await page.route(url, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: pageHtml(extensionId),
    })
  })
  await page.goto(url)
  return extensionFrame(page, extensionId)
}

async function extensionFrame(page: Page, extensionId: string): Promise<Frame> {
  const prefix = `chrome-extension://${extensionId}`
  await expect
    .poll(() => page.frames().some((f) => f.url().startsWith(prefix)), {
      timeout: 10_000,
    })
    .toBe(true)
  const frame = page.frames().find((f) => f.url().startsWith(prefix))
  if (!frame) {
    throw new Error('extension iframe not found')
  }
  return frame
}

function readSentinel(name: string): Promise<boolean> {
  return navigator.storage
    .getDirectory()
    .then((root) => root.getFileHandle(name))
    .then((handle) => handle.getFile())
    .then((file) => file.text())
    .then((text) => text === 'hello')
    .catch(() => false)
}

test('occlusion model cache: extension OPFS is global across top-level sites', async ({
  context,
  extensionId,
}) => {
  const frameA = await openWithExtIframe(
    context,
    extensionId,
    'https://probe-a.invalid'
  )
  const wrote = await frameA.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write('hello')
    await writable.close()
    return true
  }, SENTINEL)
  expect(wrote).toBe(true)

  const frameB = await openWithExtIframe(
    context,
    extensionId,
    'https://probe-b.invalid'
  )
  const crossSiteVisible = await frameB.evaluate(readSentinel, SENTINEL)

  expect(crossSiteVisible).toBe(true)
})
