import { Alert, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { type Control, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  type IntegrationInput,
  zIntegrationPolicy,
} from '@/common/options/integrationPolicyStore/schema'
import { extractMediaInfo } from '@/content/controller/danmaku/integration/xPathPolicyOps/extractMediaInfo'
import { matchNodesByXPathPolicy } from '@/content/controller/danmaku/integration/xPathPolicyOps/matchNodesByXPathPolicy'

interface IntegrationPreviewProps {
  control: Control<IntegrationInput>
}

export const IntegrationPreview = ({ control }: IntegrationPreviewProps) => {
  const { t } = useTranslation()

  const policy = useWatch({ control, name: 'policy' })

  const extractionResult = useMemo(() => {
    // Form state is input-typed; parse to apply schema defaults before
    // handing it to consumers that expect the canonical output shape.
    const parsed = zIntegrationPolicy.safeParse(policy)
    if (!parsed.success) {
      return null
    }
    const nodes = matchNodesByXPathPolicy(parsed.data)
    if (!nodes) {
      return null
    }
    return extractMediaInfo(nodes, parsed.data)
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
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 'bold',
          }}
        >
          {t('integrationPolicyPage.editor.matchResult', 'Match Result')}
        </Typography>
        <Typography variant="body2">{mediaInfo.toString()}</Typography>
      </Stack>
    </Alert>
  )
}
