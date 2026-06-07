import { Box, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { matchesQuery } from '../catalog'
import { useNeedsAttention } from '../hooks/useNeedsAttention'
import { ProviderRow } from './ProviderRow'
import { SectionHeader } from './SectionHeader'

interface NeedsAttentionCalloutProps {
  configs: ProviderConfig[]
  filter: string
}

export const NeedsAttentionCallout = ({
  configs,
  filter,
}: NeedsAttentionCalloutProps) => {
  const { t } = useTranslation()
  const attention = useNeedsAttention(configs).filter((item) =>
    matchesQuery(filter, item.config.name, item.config.manifestId)
  )

  if (attention.length === 0) {
    return null
  }

  return (
    <Box sx={{ pb: 0.5 }}>
      <SectionHeader
        title={t('providers.attention.title', 'Sign in suggested')}
        count={attention.length}
      />
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: (theme) => theme.palette.paperAlt,
          overflow: 'hidden',
        }}
      >
        {attention.map((item) => {
          const url = item.cookieSet?.url
          const canSignIn = url ? /^https?:\/\//i.test(url) : false
          return (
            <ProviderRow
              key={item.config.id}
              avatarSeed={item.config.manifestId}
              primary={item.config.name}
              secondary={t(
                'providers.attention.signInHint',
                'Sign in for complete danmaku'
              )}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!canSignIn}
                  onClick={() => chrome.tabs.create({ url })}
                >
                  {t('providers.attention.signIn', 'Sign in')}
                </Button>
              }
            />
          )
        })}
      </Box>
    </Box>
  )
}
