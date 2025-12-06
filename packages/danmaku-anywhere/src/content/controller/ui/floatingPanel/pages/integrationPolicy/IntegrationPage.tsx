import { Box } from '@mui/material'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useStore } from '@/content/controller/store/store'
import { IntegrationInfo } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationInfo'
import { IntegrationEditor } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/IntegrationEditor'

export const IntegrationPage = () => {
  const activeConfig = useActiveConfig()
  const { showEditor } = useStore.use.integrationForm()

  if (!activeConfig) {
    return <div>No active config</div>
  }

  if (showEditor) {
    return <IntegrationEditor />
  }

  // switch (activeConfig.mode) {
  //   case 'ai': {
  //     return <div>AI mode</div>
  //   }
  //   case 'custom': {
  //     return <div>Custom mode</div>
  //   }
  //   case 'manual': {
  //     return <div>Manual mode</div>
  //   }
  // }

  return (
    <Box p={2} flexGrow={1}>
      <IntegrationInfo />
    </Box>
  )
}
