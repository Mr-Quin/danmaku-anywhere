import type { BrowserContext } from '@playwright/test'
import { defaultDanmakuOptions } from '../../../src/common/options/danmakuOptions/constant'
import { Popup } from '../../pom/Popup'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Model management UI in the occlusion settings, against the bundled baseline
 * (people + the hosted anime model) and the real background-worker OPFS. A fake
 * model blob is written into the extension-origin OPFS the worker shares with
 * the segmenter iframe; the popup then lists the models, reflects that download
 * state, switches the active model (persisting to danmakuOptions), and on delete
 * actually evicts the OPFS file. No real model download or manifest fetch.
 */

function seedModelFile(
  context: BrowserContext,
  id: string,
  size: number
): Promise<void> {
  const [sw] = context.serviceWorkers()
  return sw.evaluate(
    async ([name, bytes]) => {
      const root = await navigator.storage.getDirectory()
      const handle = await root.getFileHandle(name as string, { create: true })
      const writable = await handle.createWritable()
      await writable.write(new Uint8Array(bytes as number))
      await writable.close()
    },
    [id, size] as [string, number]
  )
}

function modelFileSize(
  context: BrowserContext,
  id: string
): Promise<number | null> {
  const [sw] = context.serviceWorkers()
  return sw.evaluate(async (name) => {
    try {
      const root = await navigator.storage.getDirectory()
      const handle = await root.getFileHandle(name)
      return (await handle.getFile()).size
    } catch {
      return null
    }
  }, id)
}

function activeModel(da: DaClient) {
  return da.storage.get('sync', 'danmakuOptions').then((stored) => {
    return (stored as { data: { occlusionModel: string } }).data.occlusionModel
  })
}

test('occlusion models: lists, reflects OPFS state, switches active, and evicts on delete', async ({
  context,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    rawStorage: [
      {
        area: 'sync',
        key: 'danmakuOptions',
        value: {
          data: {
            ...defaultDanmakuOptions,
            occlusion: true,
            occlusionModel: 'anime',
          },
          version: 10,
        },
      },
    ],
  })
  // The anime model is hosted: pre-seed its OPFS file so it reads as downloaded.
  await seedModelFile(context, 'anime', 4096)

  const page = await context.newPage()
  await Popup.open(page, extensionId, '/styles')

  // Direct testids rather than a POM: this is the only spec touching the model
  // manager and its rows expose stable data-testids.
  await expect(page.getByTestId('occlusion-model-people')).toBeVisible()
  // A delete action is only offered for a downloaded hosted model.
  await expect(page.getByTestId('occlusion-model-delete-anime')).toBeVisible()

  // Switch the active model (anime's radio is WebGPU-gated in CI; the people
  // radio drives the switch) and confirm it persists to danmakuOptions.
  await page.getByTestId('occlusion-model-people').getByRole('radio').check()
  await expect.poll(() => activeModel(da)).toBe('people')

  // Delete evicts the OPFS file and the row flips to offering a download.
  await page.getByTestId('occlusion-model-delete-anime').click()
  await expect(page.getByTestId('occlusion-model-download-anime')).toBeVisible()
  await expect.poll(() => modelFileSize(context, 'anime')).toBeNull()
})
