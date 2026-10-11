import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGzip } from 'node:zlib'
import { expect, test } from '@playwright/test'
import migrationConfig from '../migration.config.json' with { type: 'json' }
import { MigrationLegacyPopup } from '../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { MIGRATION_EXTENSION_ID } from '../setup/extensionKey'
import { ensurePriorRelease } from '../setup/priorRelease'
import { launchExtension } from '../setup/swapExtension'

/**
 * Writes e2e/fixtures/migration/backup.json.gz from v1.5.0 itself. Starts from
 * v1.5.0's own fresh-install export, so every store carries the version and
 * the default fields v1.5.0 writes, layers a user's edits on top, restores
 * that through v1.5.0's backup page, disables a built-in source through its
 * providers page, and saves v1.5.0's second export as the fixture.
 *
 *   pnpm exec playwright test --config e2e/fixture-gen/playwright.config.ts
 */

const OUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'migration',
  'backup.json.gz'
)

interface ServiceBackup {
  version: number
  data: unknown
}

interface Backup {
  meta: Record<string, unknown>
  services: Record<string, ServiceBackup>
}

test('regenerate the v1.5.0 backup fixture', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'da-gen-'))
  const priorExt = await ensurePriorRelease(migrationConfig.baselinePriorTag)
  const context = await launchExtension(path.join(tmpRoot, 'profile'), priorExt)
  try {
    await context.route(
      /api\.github\.com\/repos\/[^/]+\/[^/]+\/releases\//,
      (route) => {
        return route.fulfill({
          json: {
            name: '',
            body: '',
            html_url: 'https://release.invalid',
            published_at: '2020-01-01T00:00:00Z',
          },
        })
      }
    )
    const popup = await MigrationLegacyPopup.open(
      context,
      MIGRATION_EXTENSION_ID
    )
    const fresh = (await popup.exportBackup()) as Backup
    const seededPath = path.join(tmpRoot, 'seeded.json')
    await fs.writeFile(seededPath, JSON.stringify(withUserEdits(fresh)))
    await popup.restoreBackup(seededPath)
    await popup.toggleProvider(/Tencent|腾讯/)

    const exported = (await popup.exportBackup()) as Backup
    await popup.close()

    expect(Object.keys(exported.services).sort()).toEqual(
      Object.keys(fresh.services).sort()
    )
    for (const [name, service] of Object.entries(exported.services)) {
      expect(service.version, `${name} stays at v1.5.0's version`).toBe(
        fresh.services[name]?.version
      )
    }

    await pipeline(
      async function* () {
        yield Buffer.from(JSON.stringify(exported, null, 2), 'utf8')
      },
      createGzip(),
      createWriteStream(OUT_PATH)
    )
  } finally {
    await context.close().catch(() => undefined)
    await fs.rm(tmpRoot, { recursive: true, force: true })
  }
})

function withUserEdits(fresh: Backup): Backup {
  const services = structuredClone(fresh.services)
  const extensionOptions = services.extensionOptions.data as Record<
    string,
    unknown
  >
  const hotkeys = extensionOptions.hotkeys as Record<
    string,
    { key: string; enabled: boolean }
  >
  services.extensionOptions.data = {
    ...extensionOptions,
    id: '00000000-0000-0000-0000-000000000001',
    lang: 'en',
    searchUsingSimplified: true,
    theme: { colorMode: 'dark' },
    retentionPolicy: { enabled: true, deleteCommentsAfter: 14 },
    playerOptions: {
      ...(extensionOptions.playerOptions as Record<string, unknown>),
      showSkipButton: false,
    },
    hotkeys: {
      ...hotkeys,
      refreshComments: { key: 'alt+r', enabled: true },
      togglePip: { ...hotkeys.togglePip, enabled: false },
    },
  }

  const danmakuOptions = services.danmakuOptions.data as Record<string, unknown>
  services.danmakuOptions.data = {
    ...danmakuOptions,
    speed: 1.5,
    useCustomCss: true,
    customCss: '.da-danmaku {\n  font-weight: 800;\n}',
    filters: [
      { type: 'text', value: '剧透', enabled: true },
      { type: 'regex', value: '^前方高能', enabled: false },
    ],
    area: { xStart: 10, xEnd: 90, yStart: 5, yEnd: 60 },
    style: {
      ...(danmakuOptions.style as Record<string, unknown>),
      fontSize: 30,
    },
  }

  const builtins = new Map(
    (services.providerConfig.data as Array<{ id: string }>).map((config) => [
      config.id,
      config,
    ])
  )
  services.providerConfig.data = [
    {
      enabled: true,
      id: 'd9d068cc-d7a5-4277-990b-73b28f7637f8',
      impl: 'DanDanPlay',
      isBuiltIn: false,
      name: 'DanDanPlay',
      options: {
        auth: {
          enabled: true,
          headers: [
            { key: 'X-AppId', value: 'REDACTED_SECRET' },
            { key: 'X-AppSecret', value: 'REDACTED_SECRET' },
          ],
        },
        baseUrl: 'https://ddp.selfhosted.example/api',
      },
      type: 'DanDanPlayCompatible',
    },
    builtins.get('builtin:bilibili'),
    builtins.get('builtin:dandanplay'),
    {
      enabled: true,
      id: '21999133-1b22-4e15-a48b-a8c6677cd902',
      impl: 'Custom',
      isBuiltIn: false,
      name: 'VOD',
      options: {
        danmakuBaseUrl: 'https://vod.selfhosted.example/danmaku',
        danmuicuBaseUrl: 'https://vod.selfhosted.example/danmuicu',
        stripColor: false,
      },
      type: 'MacCMS',
    },
    builtins.get('builtin:tencent'),
    {
      enabled: true,
      id: 'e15d5979-e823-4ce8-a2ab-513dc358dae1',
      impl: 'DanDanPlay',
      isBuiltIn: false,
      name: 'Danmu API',
      options: {
        auth: { enabled: false, headers: [] },
        baseUrl: 'https://danmu.selfhosted.example',
      },
      type: 'DanDanPlayCompatible',
    },
  ]

  services.aiProviderConfig.data = [
    ...(services.aiProviderConfig.data as unknown[]),
    {
      enabled: true,
      id: '644241b5-68bb-43b4-8f63-4ecc860373a5',
      isBuiltIn: false,
      name: 'openai',
      provider: 'openai-compatible',
      settings: {
        apiKey: 'REDACTED_API_KEY',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
        model: 'gpt-5-nano',
        providerOptions: {},
      },
    },
    {
      enabled: false,
      id: '7092c0a2-1651-4766-adef-a667f5d51710',
      isBuiltIn: false,
      name: 'ollama',
      provider: 'openai-compatible',
      settings: {
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
        headers: {},
        model: 'deepseek-r1:7b',
        providerOptions: {},
        queryParams: {},
      },
    },
  ]

  const integrationId = '67d4ae50-a697-41b0-925c-40937a2fa19a'
  services.integrationPolicy.data = [
    {
      id: integrationId,
      name: 'danmaku-somewhere',
      version: 3,
      policy: {
        version: 3,
        title: {
          selector: [{ value: '//*[@id="media-title"]', quick: false }],
          regex: [],
        },
        episode: {
          selector: [{ value: '//*[@id="episode"]', quick: false }],
          regex: [{ value: '第(\\d+)集', quick: false }],
        },
        season: { selector: [], regex: [] },
        episodeTitle: { selector: [], regex: [] },
        options: {},
      },
    },
  ]

  services.mountConfig.data = [
    {
      id: '081cea50-9433-4e51-b219-9e0a1fcad3b2',
      name: 'Danmaku Somewhere',
      enabled: true,
      patterns: ['https://danmaku.weeblify.app/*'],
      mediaQuery: 'video',
      mode: 'xpath',
      integration: integrationId,
      ai: { providerId: 'built-in' },
    },
    {
      id: '89eb0cef-b290-450e-833c-ecf86734467d',
      name: 'Jellyfin',
      enabled: false,
      patterns: ['https://jellyfin.selfhosted.example/*'],
      mediaQuery: 'video',
      mode: 'ai',
      ai: { providerId: '644241b5-68bb-43b4-8f63-4ecc860373a5' },
    },
  ]

  return { meta: fresh.meta, services }
}
