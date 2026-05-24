import type { DanmakuFilter } from '@danmaku-anywhere/danmaku-engine'
import { FilterAltOutlined } from '@mui/icons-material'
import { Alert, alpha, Paper, Stack, Typography, useTheme } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilterTextField } from './FilterTextField'
import { ruleDisplay } from './utils'

type InlineTesterProps = {
  filters: DanmakuFilter[]
}

function findFirstMatch(text: string, filters: DanmakuFilter[]) {
  return filters.find((f) => {
    if (!f.enabled) return false
    if (f.type === 'text') return text.includes(f.value)
    try {
      return new RegExp(f.value).test(text)
    } catch {
      return false
    }
  })
}

export function InlineTester({ filters }: InlineTesterProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [input, setInput] = useState('')

  const match = useMemo(() => {
    if (input.length === 0) return undefined
    return findFirstMatch(input, filters)
  }, [input, filters])

  const hasInput = input.length > 0

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        bgcolor: theme.palette.paperAlt,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
        }}
      >
        <FilterAltOutlined color="primary" fontSize="small" />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
          }}
        >
          {t('danmakuFilter.testFilterPatterns', 'Test Filter Patterns')}
        </Typography>
      </Stack>
      <FilterTextField
        placeholder={t('danmakuFilter.enterTestText', 'Enter test text')}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{ bgcolor: 'background.paper', mt: 1, mb: 2 }}
      />
      {hasInput && (
        <Alert severity={match ? 'error' : 'success'}>
          {match ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span>
                {t(
                  'danmakuFilter.testResultExclude',
                  'This text will be filtered out'
                )}
              </span>
              <Typography
                variant="caption"
                component="code"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.5,
                }}
              >
                {ruleDisplay(match)}
              </Typography>
            </Stack>
          ) : (
            t(
              'danmakuFilter.testResultInclude',
              'This text will not be filtered out'
            )
          )}
        </Alert>
      )}
    </Paper>
  )
}
