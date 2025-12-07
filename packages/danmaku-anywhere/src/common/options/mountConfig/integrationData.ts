import { AutoAwesome, Build, TouchApp } from '@mui/icons-material'
import type { SvgIconTypeMap } from '@mui/material'
import type { OverridableComponent } from '@mui/material/OverridableComponent'
import { i18n } from '@/common/localization/i18n'
import type { AutomationMode } from './schema'

type IntegrationDataMap = {
  [key in AutomationMode]: {
    label: () => string
    description: () => string
    icon: OverridableComponent<SvgIconTypeMap<{}, 'svg'>>
  }
}

export const integrationData: IntegrationDataMap = {
  manual: {
    label: () => i18n.t('integration.mode.manual.label', 'Manual'),
    description: () =>
      i18n.t(
        'integration.mode.manual.description',
        "I'll select danmaku manually from library"
      ),
    icon: TouchApp,
  },
  ai: {
    label: () => i18n.t('integration.mode.ai.label', 'AI'),
    description: () =>
      i18n.t(
        'integration.mode.ai.description',
        'Let AI detect video info automatically'
      ),
    icon: AutoAwesome,
  },
  xpath: {
    label: () => i18n.t('integration.mode.xpath.label', 'XPath'),
    description: () =>
      i18n.t(
        'integration.mode.xpath.description',
        "I'll create custom XPath rules to extract video info (requires visiting site)"
      ),
    icon: Build,
  },
}
