import { Box } from '@mui/material'

import { IntegrationEditor } from './IntegrationEditor'

import { useStore } from '@/content/controller/store/store'
import { IntegrationInfo } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationInfo'

export const IntegrationPage = () => {
  const { showEditor } = useStore.use.integrationForm()

  if (showEditor) return <IntegrationEditor />

  return (
    <Box p={2} flexGrow={1}>
      <IntegrationInfo />
    </Box>
  )
}
