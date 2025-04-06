import { ListSubheader } from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  type HTMLAttributes,
  type ReactElement,
  forwardRef,
  useRef,
} from 'react'

import { DanmakuProviderChip } from '@/common/components/DanmakuProviderChip'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'

interface OptionGroup {
  group: string
  children: ReactElement[]
  key: number
}

export const ListboxComponent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLElement>
>((props, ref) => {
  const { children, ...other } = props

  const itemData: ReactElement[] = []
  ;(children as ReactElement[]).forEach(
    (item: ReactElement & { children?: ReactElement[] }) => {
      itemData.push(item)
      if (item.children) itemData.push(...item.children)
    }
  )

  const scrollElement = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: itemData.length,
    getItemKey: (index) => {
      const item = itemData[index]
      if (Object.hasOwn(item, 'group')) return `group-${item.key}`
      return `${item.key}`
    },
    getScrollElement: () => scrollElement.current,
    estimateSize: (index) => {
      return Object.hasOwn(itemData[index], 'group') ? 48 : 60
    },
  })

  return (
    <div ref={useMergeRefs(ref)}>
      <div
        ref={scrollElement}
        style={{
          overflow: 'auto',
          maxHeight: '50vh', // taken from original ListboxComponent maxHeight
          height: other.style?.height,
        }}
      >
        <ul
          {...other}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            maxHeight: `${virtualizer.getTotalSize()}px`, // override the maxHeight rule in class
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = itemData[virtualItem.index]

            // the group property is available when the renderGroup prop is passed to AutoComplete
            if (Object.hasOwn(item, 'group')) {
              const { group } = item as unknown as OptionGroup

              const [provider, groupTitle] = group.split('::')

              return (
                <ListSubheader
                  key={`group-${item.key}`}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                    textWrap: 'nowrap',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  component="div"
                  title={groupTitle}
                >
                  <span
                    style={{
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {groupTitle}
                  </span>
                  <DanmakuProviderChip
                    provider={provider as DanmakuSourceType}
                  />
                </ListSubheader>
              )
            }

            return (
              <div
                key={item.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {item}
              </div>
            )
          })}
        </ul>
      </div>
    </div>
  )
})

ListboxComponent.displayName = 'ListboxComponent'
