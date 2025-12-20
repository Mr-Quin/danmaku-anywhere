import { Close } from '@mui/icons-material'
import {
  alpha,
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'

type ActiveFilterListProps = {
  filters: DanmakuOptions['filters']
  onDelete: (index: number) => void
}

export const ActiveFilterList = ({
  filters,
  onDelete,
}: ActiveFilterListProps) => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {t('danmakuFilter.activeFilters')} ({filters.length})
      </Typography>
      <Paper variant="outlined">
        <List dense disablePadding>
          {filters.map((filter, i) => (
            <Box key={`${filter.type}-${filter.value}`}>
              {i > 0 && <Divider component="li" />}
              <ListItem
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDelete(i)}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      component="span"
                    >
                      <Typography
                        variant="body2"
                        component="span"
                        fontFamily={
                          filter.type === 'regex' ? 'monospace' : 'inherit'
                        }
                        noWrap
                        title={
                          filter.type === 'regex'
                            ? `/${filter.value}/`
                            : filter.value
                        }
                      >
                        {filter.type === 'regex'
                          ? `/${filter.value}/`
                          : filter.value}
                      </Typography>
                      {filter.type === 'regex' && (
                        <Chip
                          label={t('common.regexShort', 'Regex')}
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                            color: theme.palette.secondary.main,
                            fontWeight: 'bold',
                            height: 20,
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            </Box>
          ))}
          {filters.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    {t('danmakuFilter.noActiveFilters')}
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  )
}
