import { Alert, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { type Control, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { extractMediaInfo } from '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo'
import { matchNodesByXPathPolicy } from '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy'

interface IntegrationPreviewProps {
  control: Control<IntegrationInput>
}

export const IntegrationPreview = ({ control }: IntegrationPreviewProps) => {
  const { t } = useTranslation()

  const policy = useWatch({ control, name: 'policy' })

  const extractionResult = useMemo(() => {
    const nodes = matchNodesByXPathPolicy(policy)
    if (!nodes) {
      return null
    }
    return extractMediaInfo(nodes, policy)
  }, [policy])

  if (!extractionResult) {
    return (
      <Alert severity="warning">
        {t('integrationPolicyPage.editor.noNodesFound', 'No nodes found')}
      </Alert>
    )
  }

  if (!extractionResult.success) {
    return (
      <Alert severity="error">
        {t(
          'integrationPolicyPage.editor.noPreviewAvailable',
          'An error occurred while extracting media info'
        )}
        <Typography variant="body2">{extractionResult.error}</Typography>
      </Alert>
    )
  }

  const mediaInfo = extractionResult.mediaInfo

  return (
    <Alert severity="success">
      <Stack spacing={1} direction="row">
        <Typography variant="subtitle2" fontWeight="bold">
          {t('integrationPolicyPage.editor.matchResult', 'Match Result')}
        </Typography>
        <Typography variant="body2">{mediaInfo.toString()}</Typography>
      </Stack>
    </Alert>
  )
}
