import { applyFilter } from '@danmaku-anywhere/danmaku-engine'
import { Delete } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import type { Draft } from 'immer'
import { produce } from 'immer'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

const isRegex = (pattern: string) => {
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    return true
  }
}

const validateRegex = (
  pattern: string,
  filters: DanmakuOptions['filters']
): { success: true; pattern: string } | { success: false; error: string } => {
  try {
    const regexContent = pattern.slice(1, -1)
    if (regexContent.length === 0) {
      throw new Error('stylePage.filtering.validation.patternEmpty')
    }
    if (
      filters.some(
        (filter) => filter.type === 'regex' && filter.value === regexContent
      )
    ) {
      throw new Error('stylePage.filtering.validation.duplicate')
    }
    new RegExp(pattern)
    return {
      success: true,
      pattern: regexContent,
    }
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : 'stylePage.filtering.validation.invalidRegex',
    }
  }
}

const validatePattern = (
  pattern: string,
  filters: DanmakuOptions['filters']
): { success: true; pattern: string } | { success: false; error: string } => {
  const trimmedPattern = pattern.trim()

  if (pattern.trim().length === 0) {
    return {
      success: false,
      error: 'stylePage.filtering.validation.patternEmpty',
    }
  }
  if (
    filters.some(
      (filter) => filter.type === 'text' && filter.value === trimmedPattern
    )
  ) {
    return {
      success: false,
      error: 'stylePage.filtering.validation.duplicate',
    }
  }
  return {
    success: true,
    pattern: trimmedPattern,
  }
}

type FilterPageProps = {
  onGoBack: () => void
  initialFilter?: string
}

export const FilterPage = ({ onGoBack, initialFilter }: FilterPageProps) => {
  const { t } = useTranslation()
  const {
    data: config,
    partialUpdate,
    update: { isPending },
  } = useDanmakuOptions()

  const [filterPattern, setFilterPattern] = useState(
    typeof initialFilter === 'string' ? initialFilter : ''
  )
  const [filterError, setFilterError] = useState('')

  const [filterTestString, setFilterTestString] = useState('')
  const [filterTestResult, setFilterTestResult] = useState({
    resolved: false,
    result: false,
  })

  const handleUpdate = (updater: (draft: Draft<DanmakuOptions>) => void) => {
    void partialUpdate(produce(config, updater))
  }

  const handleAddFilter = () => {
    if (isRegex(filterPattern)) {
      const result = validateRegex(filterPattern, config.filters)
      if (!result.success) {
        setFilterError(result.error)
        return
      }
      handleUpdate((draft) => {
        draft.filters.push({
          type: 'regex',
          value: result.pattern,
          enabled: true,
        })
      })
    } else {
      const result = validatePattern(filterPattern, config.filters)
      if (!result.success) {
        setFilterError(result.error)
        return
      }
      handleUpdate((draft) => {
        draft.filters.push({
          type: 'text',
          value: result.pattern,
          enabled: true,
        })
      })
    }
  }

  const handleTestFilter = () => {
    setFilterTestResult({
      resolved: true,
      result: applyFilter(filterTestString, config.filters),
    })
  }

  return (
    <TabLayout>
      <TabToolbar
        title={t('stylePage.filtering.name', 'Filter Settings')}
        showBackButton
        onGoBack={onGoBack}
      />
      <Box p={2}>
        <Typography mb={2}>
          {t('stylePage.filtering.addFilterPattern', 'Add Filter Pattern')}
        </Typography>
        <Stack direction="row" gap={2} alignItems="flex-start">
          <TextField
            label={t(
              'stylePage.filtering.enterFilterPattern',
              'Enter filter pattern, wrap with "/" for regex'
            )}
            size="small"
            error={!!filterError}
            helperText={t(filterError)}
            value={filterPattern}
            onChange={(e) => {
              setFilterError('')
              setFilterPattern(e.target.value)
            }}
            {...withStopPropagation()}
            sx={{
              flexGrow: 1,
            }}
          />
          <Button
            variant="contained"
            onClick={() => {
              handleAddFilter()
            }}
            disabled={isPending || filterPattern.length === 0}
          >
            {t('common.add', 'Add')}
          </Button>
        </Stack>
        <Typography my={2}>
          {t('stylePage.filtering.testFilterPatterns', 'Test Filter Patterns')}
        </Typography>
        <Stack direction="row" gap={2} alignItems="flex-start">
          <TextField
            label={t('stylePage.filtering.enterTestText', 'Enter test text')}
            size="small"
            helperText={
              filterTestResult.resolved
                ? filterTestResult.result
                  ? t(
                      'stylePage.filtering.testResultExclude',
                      'This text will be filtered out'
                    )
                  : t(
                      'stylePage.filtering.testResultInclude',
                      'This text will not be filtered out'
                    )
                : ''
            }
            value={filterTestString}
            {...withStopPropagation()}
            onChange={(e) => {
              setFilterTestString(e.target.value)
              setFilterTestResult({
                resolved: false,
                result: false,
              })
            }}
            sx={{
              flexGrow: 1,
            }}
          />
          <Tooltip
            title={
              config.filters.length === 0
                ? t(
                    'stylePage.filtering.tooltip.noFilter',
                    'Filter is empty, add some patterns to test'
                  )
                : ''
            }
          >
            <div>
              <Button
                variant="contained"
                onClick={() => {
                  handleTestFilter()
                }}
                disabled={config.filters.length === 0}
              >
                {t('common.test', 'Test')}
              </Button>
            </div>
          </Tooltip>
        </Stack>
      </Box>
      <Typography px={2} mt={1}>
        {t('stylePage.filtering.patternList', 'Pattern List')}
      </Typography>
      <List>
        {config.filters.map((filter, i) => {
          return (
            <ListItem
              key={filter.value}
              dense
              secondaryAction={
                <IconButton
                  disabled={isPending}
                  onClick={() => {
                    handleUpdate((draft) => {
                      draft.filters.splice(i, 1)
                    })
                  }}
                  edge="end"
                >
                  <Delete />
                </IconButton>
              }
            >
              {filter.type === 'regex' && (
                <ListItemIcon>
                  <Chip size="small" label={t('common.regexShort', 'Regex')} />
                </ListItemIcon>
              )}
              <ListItemText
                primary={
                  filter.type === 'regex' ? `/${filter.value}/` : filter.value
                }
              />
            </ListItem>
          )
        })}
      </List>
    </TabLayout>
  )
}

export const FilterPageWithRouter = () => {
  const { state } = useLocation()
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <FilterPage
      onGoBack={handleGoBack}
      initialFilter={typeof state === 'string' ? state : undefined}
    />
  )
}
