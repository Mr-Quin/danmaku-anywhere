import { applyFilter } from '@danmaku-anywhere/danmaku-engine'
import { FilterAltOutlined } from '@mui/icons-material'
import {
  Alert,
  alpha,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'

type TestFilterProps = {
  filters: DanmakuOptions['filters']
}

export const TestFilter = ({ filters }: TestFilterProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [filterTestString, setFilterTestString] = useState('')
  const [filterTestResult, setFilterTestResult] = useState<{
    resolved: boolean
    result?: boolean
  }>({
    resolved: false,
  })

  const handleTestFilter = () => {
    setFilterTestResult({
      resolved: true,
      result: applyFilter(filterTestString, filters),
    })
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        borderColor: alpha(theme.palette.primary.main, 0.2),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <FilterAltOutlined color="primary" fontSize="small" />
        <Typography variant="subtitle2" color="text.primary">
          {t('danmakuFilter.testFilterPatterns', 'Test Filter Patterns')}
        </Typography>
      </Stack>

      <TextField
        placeholder={t('danmakuFilter.enterTestText', 'Enter test text')}
        fullWidth
        size="small"
        value={filterTestString}
        onChange={(e) => {
          setFilterTestString(e.target.value)
          setFilterTestResult({ resolved: false })
        }}
        sx={{ bgcolor: 'background.paper' }}
      />

      <Button
        fullWidth
        onClick={handleTestFilter}
        disabled={!filterTestString}
        sx={{
          mt: 1,
          mb: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.2),
          color: theme.palette.primary.main,
          boxShadow: 'none',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.3),
            boxShadow: 'none',
          },
        }}
      >
        {t('common.test', 'Test')}
      </Button>

      {filterTestResult.resolved && (
        <Alert severity={filterTestResult.result ? 'error' : 'success'}>
          {filterTestResult.result
            ? t(
                'danmakuFilter.testResultExclude',
                'This text will be filtered out'
              )
            : t(
                'danmakuFilter.testResultInclude',
                'This text will not be filtered out'
              )}
        </Alert>
      )}
    </Paper>
  )
}
