import { ListSubheader } from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  useRef,
} from 'react'

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
          maxHeight: '40vh', // taken from original ListboxComponent maxHeight
        }}
      >
        <ul
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            maxHeight: `${virtualizer.getTotalSize()}px`, // override the maxHeight rule in class
            width: '100%',
            position: 'relative',
          }}
          {...other}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = itemData[virtualItem.index]

            // the group property is available when the renderGroup prop is passed to AutoComplete
            if (Object.hasOwn(item, 'group')) {
              const { group } = item as unknown as OptionGroup
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
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                  component="div"
                  title={group}
                >
                  {group}
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
