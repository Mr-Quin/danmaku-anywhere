import { InfoOutlined as InfoIcon } from '@mui/icons-material'
import {
  Box,
  Grid,
  Tooltip,
  Typography,
  type TypographyProps,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  NumberScrubber,
  type NumberScrubberProps,
} from '@/common/components/form/NumberScrubber'

interface LabeledScrubberProps extends NumberScrubberProps {
  label: ReactNode
  tooltip?: ReactNode
  typographyProps?: TypographyProps
  children?: ReactNode
  gridSize?: number
  onReset?: () => void
}

export const LabeledScrubber = ({
  label,
  tooltip,
  typographyProps = {},
  children,
  gridSize = 12,
  onReset,
  ...rest
}: LabeledScrubberProps) => {
  const { t } = useTranslation()
  const id = useId()
  return (
    <Box>
      <Box
        sx={{
          mb: 1,
        }}
      >
        <Typography
          id={id}
          gutterBottom
          {...typographyProps}
          variant="body2"
          sx={[
            {
              fontWeight: 600,
            },
            ...(Array.isArray(typographyProps.sx)
              ? typographyProps.sx
              : [typographyProps.sx]),
          ]}
        >
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          {tooltip}
          <Tooltip
            title={
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                }}
              >
                <Typography variant="body2">
                  {t('form.precision.drag', 'Drag / Wheel')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', textAlign: 'right' }}
                >
                  {rest.step || 1}
                  {rest.unit || ''}
                </Typography>
                <Typography variant="body2">
                  {t('form.precision.shift', 'Shift')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', textAlign: 'right' }}
                >
                  {rest.fastStep || 10}
                  {rest.unit || ''}
                </Typography>
                <Typography variant="body2">
                  {t('form.precision.alt', 'Alt')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', textAlign: 'right' }}
                >
                  {rest.slowStep || 0.1}
                  {rest.unit || ''}
                </Typography>
              </Box>
            }
            placement="top"
          >
            <InfoIcon
              fontSize="small"
              sx={{ ml: 0.5, verticalAlign: 'text-bottom' }}
            />
          </Tooltip>
        </Typography>
      </Box>
      <Grid
        container
        spacing={2}
        sx={{
          alignItems: 'center',
          flexWrap: 'nowrap',
        }}
      >
        <Grid size={gridSize}>
          <NumberScrubber aria-labelledby={id} onReset={onReset} {...rest} />
        </Grid>
        {children}
      </Grid>
    </Box>
  )
}
