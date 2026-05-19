import { ButtonBase, Stack, styled } from '@mui/material'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface SourceFilterChipsProps {
  providers: ProviderConfig[]
  counts: Record<string, number | undefined>
  activeId: string
  onChange: (id: string) => void
}

const Chip = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ theme, active }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 22,
  padding: '0 9px',
  borderRadius: 999,
  flexShrink: 0,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.1,
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 120ms ease, color 120ms ease',
  backgroundColor: active ? theme.palette.primary.main : theme.palette.paperAlt,
  color: active
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: active
      ? theme.palette.primary.dark
      : theme.palette.action.hover,
  },
  '&.Mui-focusVisible': {
    boxShadow: `0 0 0 2px ${theme.palette.action.focus}`,
  },
}))

const CountText = styled('span', {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  fontSize: 11,
  opacity: active ? 0.85 : 0.65,
}))

function providerLabel(provider: ProviderConfig): string {
  if (provider.isBuiltIn) {
    return localizedDanmakuSourceType(provider.impl)
  }
  return provider.name
}

export function SourceFilterChips({
  providers,
  counts,
  activeId,
  onChange,
}: SourceFilterChipsProps) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        overflowX: 'auto',
        pb: 0.25,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {providers.map((provider) => {
        const active = provider.id === activeId
        const count = counts[provider.id]
        return (
          <Chip
            key={provider.id}
            active={active}
            onClick={() => onChange(provider.id)}
            aria-pressed={active}
          >
            {providerLabel(provider)}
            {typeof count === 'number' && count > 0 && (
              <CountText active={active}>· {count}</CountText>
            )}
          </Chip>
        )
      })}
    </Stack>
  )
}
