import { Add } from '@mui/icons-material'
import { Box, Button, MenuItem, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'

interface ProviderToolbarProps {
  onAddDanDanPlayProvider: () => void
  onAddMacCmsProvider: () => void
}

export const ProviderToolbar = ({
  onAddDanDanPlayProvider,
  onAddMacCmsProvider,
}: ProviderToolbarProps) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <Box p={2}>
      <Stack direction="row" spacing={2}>
        <DrilldownMenu
          ButtonProps={{
            startIcon: <Add />,
            variant: 'contained',
          }}
          buttonText={t('providers.add')}
        >
          <MenuItem onClick={onAddDanDanPlayProvider}>
            {t('providers.type.custom-dandanplay')}
          </MenuItem>
          <MenuItem onClick={onAddMacCmsProvider}>
            {t('providers.type.custom-maccms')}
          </MenuItem>
        </DrilldownMenu>
      </Stack>
    </Box>
  )
}
