import type { BrowserContext } from '@playwright/test'
import { defaultDanmakuOptions } from '../../../src/common/options/danmakuOptions/constant'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Model management UI in the occlusion settings: with a seeded manifest and a
 * fake model blob written into the extension-origin OPFS (shared with the
 * background worker), the popup lists the models, reflects the OPFS download
 * state, switches the active model (persisting to danmakuOptions), and on delete
 * evicts the OPFS file and falls back to the default model. No real download or
 * manifest fetch happens; the manifest is seeded into the cache.
 */

const MANIFEST = {
  version: 99,
  models: [
    {
      id: 'people',
      label: { en: 'People', zh: '真人' },
      runtime: 'mediapipe',
      delivery: 'bundled',
      inputSize: 256,
      requiresWebGpu: false,
    },
    {
      // Hosted but WebGPU-free so its picker radio is selectable in CI.
      id: 'isnet-cpu',
      label: { en: 'ISNet CPU', zh: '测试模型' },
      runtime: 'ort',
      delivery: 'hosted',
      url: 'https://assets.danmaku.weeblify.app/models/isnet-cpu.onnx',
      sha256: 'c'.repeat(64),
      inputSize: 320,
      requiresWebGpu: false,
    },
  ],
}

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
      const file = await handle.getFile()
      return file.size
    } catch {
      return null
    }
  }, id)
}

async function activeModel(da: Awaited<ReturnType<typeof getDaClient>>) {
  const stored = (await da.storage.get('sync', 'danmakuOptions')) as {
    data: { occlusionModel: string }
  }
  return stored.data.occlusionModel
}

test('occlusion models: lists, reflects OPFS state, switches active, and evicts on delete', async ({
  context,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    rawStorage: [
      {
        area: 'local',
        key: 'modelManifestCache',
        value: { manifest: MANIFEST, fetchedAt: Date.now() },
      },
      {
        area: 'sync',
        key: 'danmakuOptions',
        value: {
          data: { ...defaultDanmakuOptions, occlusion: true },
          version: 10,
        },
      },
    ],
  })
  await seedModelFile(context, 'isnet-cpu', 4096)

  const page = await context.newPage()
  await Popup.open(page, extensionId, '/styles')

  // Direct testids rather than a POM: this is the only spec touching the model
  // manager, and its rows expose stable data-testids, so a dedicated POM method
  // per action would not earn its keep here.
  const hostedRow = page.getByTestId('occlusion-model-isnet-cpu')
  await expect(hostedRow).toBeVisible()
  // A delete action is only offered for a downloaded hosted model.
  await expect(
    page.getByTestId('occlusion-model-delete-isnet-cpu')
  ).toBeVisible()
  await expect(
    page.getByTestId('occlusion-model-people').getByRole('radio')
  ).toBeChecked()

  await hostedRow.getByRole('radio').check()
  await expect.poll(() => activeModel(da)).toBe('isnet-cpu')

  await page.getByTestId('occlusion-model-delete-isnet-cpu').click()
  // The OPFS file is evicted and the row now offers a download instead.
  await expect(
    page.getByTestId('occlusion-model-download-isnet-cpu')
  ).toBeVisible()
  await expect.poll(() => modelFileSize(context, 'isnet-cpu')).toBeNull()
  // Deleting the active model falls back to the default.
  await expect.poll(() => activeModel(da)).toBe('people')
})
