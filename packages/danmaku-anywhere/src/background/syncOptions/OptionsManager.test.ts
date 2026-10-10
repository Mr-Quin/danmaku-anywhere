import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it } from 'vitest'
import { createBackgroundContainer } from '@/background/ioc'
import { EXTENSION_VERSION } from '@/common/constants'
import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { OptionsManager } from './OptionsManager'

describe('OptionsManager', () => {
  it('resumes an interrupted upgrade when the worker wakes without an install or startup event', async () => {
    await fakeBrowser.storage.local.set({
      lastVersion: { lastVersion: '0.0.1' },
    })
    await fakeBrowser.storage.sync.set({
      danmakuOptions: { data: defaultDanmakuOptions, version: 1 },
    })

    const container = createBackgroundContainer()
    container.get(OptionsManager).setup()

    const danmakuOptions = container.get(DanmakuOptionsService)
    await expect(danmakuOptions.get()).resolves.toBeDefined()
    expect(await danmakuOptions.options.getVersion()).toBeGreaterThan(1)
    expect(await fakeBrowser.storage.local.get('lastVersion')).toEqual({
      lastVersion: { lastVersion: EXTENSION_VERSION },
    })
  })
})
