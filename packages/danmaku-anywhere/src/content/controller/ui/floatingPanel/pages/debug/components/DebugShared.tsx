import {
  Chip,
  styled,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'

export const StatusDot = styled('span')<{ active: boolean }>(
  ({ theme, active }) => ({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: active
      ? theme.palette.success.main
      : theme.palette.action.disabled,
    flexShrink: 0,
  })
)

export const BoolChip = ({
  label,
  value,
}: {
  label: string
  value: boolean
}) => (
  <Chip
    label={label}
    size="small"
    color={value ? 'success' : 'default'}
    variant={value ? 'filled' : 'outlined'}
    sx={{ height: 20, fontSize: 11 }}
  />
)

export const FieldRow = ({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) => (
  <TableRow sx={{ '& td': { borderBottom: 'none', py: 0.25, px: 1 } }}>
    <TableCell
      component="th"
      sx={{
        color: 'text.secondary',
        fontSize: 12,
        whiteSpace: 'nowrap',
        width: 1,
      }}
    >
      {label}
    </TableCell>
    <TableCell sx={{ fontSize: 12 }}>{value}</TableCell>
  </TableRow>
)

export const FieldTable = ({ children }: { children: ReactNode }) => (
  <Table size="small">
    <TableBody>{children}</TableBody>
  </Table>
)

export const SectionHeader = ({ children }: { children: ReactNode }) => (
  <Typography
    variant="overline"
    fontSize={10}
    color="text.secondary"
    px={1}
    pt={1.5}
    pb={0.5}
    display="block"
    letterSpacing={1.5}
  >
    {children}
  </Typography>
)
