import { describe, expect, it } from 'vitest'
import { settingConfigs } from '@/common/settings/settingConfigs'
import { defaultExtensionOptions } from './constant'
import { INFO_PANEL_ENABLED_BY_DEFAULT, isInfoPanelEnabled } from './infoPanel'

/**
 * The info panel setting stays unset until the user toggles it, and an unset
 * value follows the build default. Asserts that flipping the default changes
 * the unset case only, never an explicit choice, and that both fresh installs
 * and the settings toggle store the right shape.
 */

describe('isInfoPanelEnabled', () => {
  it('is off for an unset value while the build default is off', () => {
    expect(INFO_PANEL_ENABLED_BY_DEFAULT).toBe(false)
    expect(isInfoPanelEnabled({})).toBe(false)
  })

  it('turns an unset value on when the build default flips on', () => {
    expect(isInfoPanelEnabled({}, true)).toBe(true)
  })

  it('keeps an explicit choice whatever the build default is', () => {
    expect(isInfoPanelEnabled({ enabled: false }, true)).toBe(false)
    expect(isInfoPanelEnabled({ enabled: true }, false)).toBe(true)
  })

  it('stores no choice on a fresh install', () => {
    expect(defaultExtensionOptions.infoPanel).not.toHaveProperty('enabled')
  })
})

describe('info panel setting toggle', () => {
  const toggle = settingConfigs.player.find(
    (config) => config.id === 'toggle.infoPanel.enabled'
  )

  it('reads the resolved value and writes an explicit boolean', () => {
    if (!toggle) {
      throw new Error('info panel toggle is missing')
    }
    expect(toggle.getValue(defaultExtensionOptions)).toBe(false)
    expect(toggle.createUpdate(defaultExtensionOptions, false)).toEqual({
      infoPanel: { enabled: false },
    })
    expect(toggle.createUpdate(defaultExtensionOptions, true)).toEqual({
      infoPanel: { enabled: true },
    })
  })
})
