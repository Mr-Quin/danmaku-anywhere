import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { matchesQuery } from '../catalog'
import { useNeedsAttention } from '../hooks/useNeedsAttention'
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
        title={t('providers.attention.title', 'Needs attention')}
        count={attention.length}
      />
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
          overflow: 'hidden',
        }}
      >
        {attention.map((item, index) => {
          const url = item.cookieSet?.url
          const canSignIn = url ? /^https?:\/\//i.test(url) : false
          return (
            <Stack
              key={item.config.id}
              direction="row"
              sx={{
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.75,
                borderTop: index > 0 ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {item.config.name}
                </Typography>
                <Typography variant="caption" color="warning.main" noWrap>
                  {t(
                    'providers.attention.loginRequired',
                    'Login required to fetch'
                  )}
                </Typography>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                disabled={!canSignIn}
                onClick={() => chrome.tabs.create({ url })}
              >
                {t('providers.attention.signIn', 'Sign in')}
              </Button>
            </Stack>
          )
        })}
      </Box>
    </Box>
  )
}
