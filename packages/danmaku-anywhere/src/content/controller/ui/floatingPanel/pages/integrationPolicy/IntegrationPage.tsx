import { Share, Upload } from '@mui/icons-material'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { SegmentedTabs } from '@/common/components/SegmentedTabs'
import { useExportShareCode } from '@/common/options/combinedPolicy/useExportShareCode'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import type { AutomationMode } from '@/common/options/mountConfig/schema'
import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useStore } from '@/content/controller/store/store'
import { MatchingSteps } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/MatchingSteps'
import { AiSettingsEditor } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/AiSettingsEditor'
import { IntegrationEditor } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/IntegrationEditor'

export const IntegrationPage = () => {
  const { t } = useTranslation()
  const activeConfig = useActiveConfig()
  const { showEditor, showAiEditor } = useStore.use.integrationForm()
  const { setMode } = useEditMountConfig()

  const handleModeChange = (newMode: string) => {
    if (newMode !== activeConfig.mode && activeConfig.id) {
      void setMode.mutate({
        id: activeConfig.id,
        mode: newMode as AutomationMode,
      })
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

  if (showAiEditor) {
    return <AiSettingsEditor />
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
        sx={{
          px: 2,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowX: 'hidden',
        }}
      >
        <SegmentedTabs
          value={activeConfig.mode}
          onChange={handleModeChange}
          items={[
            {
              value: 'ai',
              label: integrationData.ai.label(),
              icon: <integrationData.ai.icon sx={{ fontSize: 14 }} />,
              tooltip: integrationData.ai.description(),
            },
            {
              value: 'xpath',
              label: integrationData.xpath.label(),
              icon: <integrationData.xpath.icon sx={{ fontSize: 14 }} />,
              tooltip: integrationData.xpath.description(),
            },
            {
              value: 'manual',
              label: integrationData.manual.label(),
              icon: <integrationData.manual.icon sx={{ fontSize: 14 }} />,
              tooltip: integrationData.manual.description(),
            },
          ]}
        />

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
