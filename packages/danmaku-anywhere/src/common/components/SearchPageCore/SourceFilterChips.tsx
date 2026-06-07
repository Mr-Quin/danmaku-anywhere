import { Box, ButtonBase, CircularProgress, styled } from '@mui/material'
import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { computeChipOverflow } from './computeChipOverflow'

const GAP = 6

export interface SourceChipState {
  isPending: boolean
  count?: number
}

interface SourceFilterChipsProps {
  providers: ProviderConfig[]
  states: Record<string, SourceChipState>
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
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.1,
  border: 'none',
  cursor: 'pointer',
  fontFamily: theme.typography.fontFamily,
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
  return provider.name
}

function chipBody(
  provider: ProviderConfig,
  active: boolean,
  state: SourceChipState | undefined
): ReactNode {
  if (state?.isPending) {
    return (
      <>
        {providerLabel(provider)}
        <CircularProgress
          size={9}
          thickness={6}
          sx={{
            color: active ? 'primary.contrastText' : 'text.secondary',
            ml: 0.25,
          }}
        />
      </>
    )
  }
  return (
    <>
      {providerLabel(provider)}
      {typeof state?.count === 'number' ? (
        <CountText active={active}>· {state.count}</CountText>
      ) : null}
    </>
  )
}

export function SourceFilterChips({
  providers,
  states,
  activeId,
  onChange,
}: SourceFilterChipsProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [overflowWidth, setOverflowWidth] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    setContainerWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // SearchForm rebuilds `states` on every render (useQueries returns a fresh
  // array), so depend on a signature of only the width-affecting inputs (label
  // text, pending spinner, count) to keep typing in the search box from
  // re-measuring the DOM each keystroke, while still re-measuring when a label
  // changes (e.g. locale switch).
  const measureSignature = providers
    .map(
      (p) =>
        `${p.id}:${providerLabel(p)}:${states[p.id]?.isPending}:${states[p.id]?.count}`
    )
    .join('|')

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) {
      return
    }
    const next: Record<string, number> = {}
    el.querySelectorAll<HTMLElement>('[data-measure-id]').forEach((node) => {
      const id = node.dataset.measureId
      if (id) {
        next[id] = node.getBoundingClientRect().width
      }
    })
    const overflowNode = el.querySelector<HTMLElement>(
      '[data-measure-overflow]'
    )
    setWidths(next)
    setOverflowWidth(overflowNode?.getBoundingClientRect().width ?? 0)
  }, [measureSignature])

  const { visible, overflow } = useMemo(
    () =>
      computeChipOverflow({
        items: providers,
        activeId,
        widths,
        containerWidth,
        overflowWidth,
        gap: GAP,
      }),
    [providers, activeId, widths, containerWidth, overflowWidth]
  )

  const overflowItems = useMemo((): DAMenuItemConfig[] => {
    return overflow.map((provider) => ({
      kind: 'item',
      id: provider.id,
      icon: null,
      label: providerLabel(provider),
      onClick: () => onChange(provider.id),
    }))
  }, [overflow, onChange])

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: `${GAP}px`,
        overflow: 'hidden',
        pb: 0.25,
        minWidth: 0,
      }}
    >
      {visible.map((provider) => {
        const active = provider.id === activeId
        return (
          <Chip
            key={provider.id}
            active={active}
            onClick={() => onChange(provider.id)}
            aria-pressed={active}
            data-testid={`source-chip-${provider.impl}`}
          >
            {chipBody(provider, active, states[provider.id])}
          </Chip>
        )
      })}

      {overflow.length > 0 && (
        <DrilldownMenu
          items={overflowItems}
          dense
          BoxProps={{ sx: { flexShrink: 0, display: 'inline-flex' } }}
          renderButton={({ onClick, id }) => (
            <Chip
              id={id}
              active={false}
              onClick={onClick}
              aria-haspopup="menu"
              aria-label={t('searchPage.moreSources', 'More sources')}
              data-testid="source-chip-overflow"
            >
              +{overflow.length}
            </Chip>
          )}
        />
      )}

      <Box
        ref={measureRef}
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          display: 'flex',
          gap: `${GAP}px`,
          width: 'max-content',
        }}
      >
        {providers.map((provider) => {
          const active = provider.id === activeId
          return (
            <Chip
              key={provider.id}
              active={active}
              tabIndex={-1}
              data-measure-id={provider.id}
            >
              {chipBody(provider, active, states[provider.id])}
            </Chip>
          )
        })}
        <Chip active={false} tabIndex={-1} data-measure-overflow>
          +{providers.length}
        </Chip>
      </Box>
    </Box>
  )
}
