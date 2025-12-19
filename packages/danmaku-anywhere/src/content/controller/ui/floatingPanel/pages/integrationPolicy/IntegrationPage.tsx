import { Share, Upload } from '@mui/icons-material'
import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { useExportShareCode } from '@/common/options/combinedPolicy/useExportShareCode'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import type { AutomationMode } from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useStore } from '@/content/controller/store/store'
import { MatchingSteps } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/MatchingSteps'
import { IntegrationEditor } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/IntegrationEditor'

export const IntegrationPage = () => {
  const { t } = useTranslation()
  const activeConfig = useActiveConfig()
  const { showEditor } = useStore.use.integrationForm()
  const { setMode } = useEditMountConfig()

  const handleModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: AutomationMode | null
  ) => {
    if (newMode && newMode !== activeConfig.mode && activeConfig.id) {
      void setMode({ id: activeConfig.id, mode: newMode })
    }
  }

  const handleImportShare = useImportShareCodeDialog(
    activeConfig.id
      ? { type: 'integration', configId: activeConfig.id }
      : { type: 'config' }
  )
  const handleExportShare = useExportShareCode()

  const menuItems: DAMenuItemConfig[] = [
    {
      id: 'import',
      label: t('configPage.importShareCode', 'Import Share Code'),
      icon: <Upload />,
      onClick: handleImportShare,
    },
  ]

  if (activeConfig.integration) {
    menuItems.push({
      id: 'export-share',
      label: t('configPage.copyShareCode', 'Copy Share Code'),
      onClick: () => handleExportShare(activeConfig),
      icon: <Share />,
    })
  }

  if (showEditor) {
    return <IntegrationEditor />
  }

  return (
    <TabLayout>
      <TabToolbar title={t('tabs.integration', 'Integration')}>
        {activeConfig.mode === 'xpath' && (
          <DrilldownMenu
            ButtonProps={{ edge: 'end', size: 'small' }}
            dense
            items={menuItems}
          />
        )}
      </TabToolbar>
      <ScrollBox
        p={2}
        flexGrow={1}
        display="flex"
        flexDirection="column"
        gap={2}
        sx={{ overflowX: 'hidden' }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <ToggleButtonGroup
            value={activeConfig.mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <Tooltip title={integrationData.ai.description()}>
              <ToggleButton value="ai">
                <integrationData.ai.icon fontSize="small" sx={{ mr: 1 }} />
                {integrationData.ai.label()}
              </ToggleButton>
            </Tooltip>
            <Tooltip title={integrationData.xpath.description()}>
              <ToggleButton value="xpath">
                <integrationData.xpath.icon fontSize="small" sx={{ mr: 1 }} />
                {integrationData.xpath.label()}
              </ToggleButton>
            </Tooltip>
            <Tooltip title={integrationData.manual.description()}>
              <ToggleButton value="manual">
                <integrationData.manual.icon fontSize="small" sx={{ mr: 1 }} />
                {integrationData.manual.label()}
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>

        {activeConfig.mode === 'manual' ? (
          <Typography>
            {t(
              'integration.manualModeEnabled',
              'Manual mode is enabled, switch to a different mode to enable automation.'
            )}
          </Typography>
        ) : (
          <MatchingSteps />
        )}
      </ScrollBox>
    </TabLayout>
  )
}
