import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_AI_PROVIDER_ID } from '@/common/options/aiProviderConfig/constant'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { LATEST_MOUNT_CONFIG_VERSION } from '@/common/options/mountConfig/version'
import { createOptionsContainer, optionsStorage } from '@/tests/optionsStore'

/**
 * Mount configs migrate per entry, so each version step is asserted against a
 * config list rather than a single object, including the version 5 step that
 * reads the xpath policy out of the upgrade context and drops entries it cannot
 * migrate. The CRUD surface is asserted against what lands in storage.
 */

const { seed, read: readStored } =
  optionsStorage<Record<string, unknown>[]>('mountConfig')

function makeLegacyConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'legacy-1',
    name: 'legacy',
    patterns: ['https://example.com/*'],
    mediaQuery: 'video',
    enabled: true,
    ...overrides,
  }
}

let service: MountConfigService

beforeEach(() => {
  service = createOptionsContainer().get(MountConfigService)
})

describe('MountConfigService migrations', () => {
  it('disables every config at version 2 and stamps an id at version 3', async () => {
    await seed([{ name: 'plex', patterns: [], mediaQuery: 'video' }], 1)

    await service.options.upgrade({ xpathPolicy: [] })

    const { data, version } = await readStored()
    expect(version).toBe(LATEST_MOUNT_CONFIG_VERSION)
    expect(data[0].enabled).toBe(false)
    expect(data[0].id).toEqual(expect.any(String))
  })

  it('drops the numeric integration at version 4 and lands on manual mode', async () => {
    await seed([makeLegacyConfig({ integration: 1 })], 3)

    await service.options.upgrade({ xpathPolicy: [] })

    const { data } = await readStored()
    expect(data[0].integration).toBeUndefined()
    expect(data[0].mode).toBe('manual')
  })

  it('reads the xpath policy from the upgrade context at version 5', async () => {
    await seed([makeLegacyConfig({ integration: 'policy-1' })], 4)

    await service.options.upgrade({
      xpathPolicy: [{ id: 'policy-1', policy: { options: { useAI: false } } }],
    })

    const { data } = await readStored()
    expect(data[0].mode).toBe('xpath')
    expect(data[0].integration).toBe('policy-1')
  })

  it('unsets the integration when the policy it points at uses AI', async () => {
    await seed([makeLegacyConfig({ integration: 'policy-1' })], 4)

    await service.options.upgrade({
      xpathPolicy: [{ id: 'policy-1', policy: { options: { useAI: true } } }],
    })

    const { data } = await readStored()
    expect(data[0].mode).toBe('ai')
    expect(data[0].integration).toBeUndefined()
  })

  it('adds the built-in ai config to every entry at the latest version', async () => {
    await seed([makeLegacyConfig(), makeLegacyConfig({ id: 'legacy-2' })], 5)

    await service.options.upgrade({ xpathPolicy: [] })

    const { data } = await readStored()
    expect(data.map((config) => config.ai)).toEqual([
      { providerId: BUILT_IN_AI_PROVIDER_ID },
      { providerId: BUILT_IN_AI_PROVIDER_ID },
    ])
  })

  it('resets the store to defaults when a step throws on a stale shape', async () => {
    await seed({ notAList: true }, 1)

    await service.options.upgrade({ xpathPolicy: [] })

    const { data, version } = await readStored()
    expect(data).toEqual([])
    expect(version).toBe(LATEST_MOUNT_CONFIG_VERSION)
  })
})

describe('MountConfigService entries', () => {
  beforeEach(async () => {
    await seed([], LATEST_MOUNT_CONFIG_VERSION)
  })

  it('creates a config from a url with an origin pattern', async () => {
    const created = await service.createByUrl('https://example.com/watch/1')

    expect(created.patterns).toEqual(['https://example.com/*'])
    expect(created.name).toBe('https://example.com')
    expect(await service.getAll()).toHaveLength(1)
  })

  it('updates a config in place and leaves its siblings untouched', async () => {
    const first = await service.create(
      createMountConfig({ name: 'first', patterns: ['https://a.com/*'] })
    )
    const second = await service.create(
      createMountConfig({ name: 'second', patterns: ['https://b.com/*'] })
    )

    await service.update(first.id, { name: 'renamed' })

    const configs = await service.getAll()
    expect(configs.map((config) => config.name)).toEqual(['renamed', 'second'])
    expect(await service.get(second.id)).toMatchObject({ name: 'second' })
  })

  it('throws when updating a config that does not exist', async () => {
    await expect(service.update('missing', { name: 'x' })).rejects.toThrow(
      'Config not found: "missing"'
    )
  })

  it('seeds the default ai config when switching a config to ai mode', async () => {
    const config = await service.create(
      createMountConfig({
        name: 'a',
        patterns: ['https://a.com/*'],
        ai: undefined,
      })
    )

    await service.changeMode(config.id, 'ai')

    expect(await service.get(config.id)).toMatchObject({
      mode: 'ai',
      ai: { providerId: BUILT_IN_AI_PROVIDER_ID },
    })
  })

  it('imports an unknown config disabled and replaces one that already exists', async () => {
    const existing = await service.create(
      createMountConfig({ name: 'a', patterns: ['https://a.com/*'] })
    )

    const imported = await service.import({
      ...(existing as MountConfig),
      name: 'replaced',
    })

    expect(imported.id).toBe(existing.id)
    const configs = await service.getAll()
    expect(configs).toHaveLength(1)
    expect(configs[0].name).toBe('replaced')
  })

  it('disables a freshly imported config', async () => {
    const incoming = {
      ...createMountConfig({
        name: 'incoming',
        patterns: ['https://c.com/*'],
        enabled: true,
      }),
      id: '00000000-0000-4000-8000-000000000000',
    } as MountConfig

    await service.import(incoming)

    expect(await service.get(incoming.id)).toMatchObject({ enabled: false })
  })

  it('clears the integration only from the configs that reference it', async () => {
    const a = await service.create(
      createMountConfig({
        name: 'a',
        patterns: ['https://a.com/*'],
        integration: 'policy-1',
      })
    )
    const b = await service.create(
      createMountConfig({
        name: 'b',
        patterns: ['https://b.com/*'],
        integration: 'policy-2',
      })
    )

    await service.unsetIntegration('policy-1')

    expect(await service.get(a.id)).not.toHaveProperty('integration')
    expect(await service.get(b.id)).toMatchObject({ integration: 'policy-2' })
  })

  it('reorders configs by moving one entry to a new index', async () => {
    for (const name of ['a', 'b', 'c']) {
      await service.create(
        createMountConfig({ name, patterns: [`https://${name}.com/*`] })
      )
    }

    await service.reorder(0, 2)

    const configs = await service.getAll()
    expect(configs.map((config) => config.name)).toEqual(['b', 'c', 'a'])
  })

  it('throws when deleting a config that does not exist', async () => {
    await expect(service.delete('missing')).rejects.toThrow(
      'Config not found: "missing"'
    )
  })
})
