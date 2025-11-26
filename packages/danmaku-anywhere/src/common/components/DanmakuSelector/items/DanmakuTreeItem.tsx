import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { TreeItem, type TreeItemProps } from '@mui/x-tree-view/TreeItem'
import type { Ref } from 'react'
import { useDanmakuTreeContext } from '@/common/components/DanmakuSelector/DanmakuTreeContext'
import { EpisodeTreeItem } from '@/common/components/DanmakuSelector/items/EpisodeTreeItem'
import { SeasonTreeItem } from '@/common/components/DanmakuSelector/items/SeasonTreeItem'

interface DanmakuTreeItemProps extends TreeItemProps {
  ref?: Ref<HTMLLIElement>
}

export const DanmakuTreeItem = (props: DanmakuTreeItemProps) => {
  const { itemId, label, ref, ...other } = props
  const { itemMap, onSelect } = useDanmakuTreeContext()
  const item = itemMap[itemId]

  if (!item) {
    return <TreeItem ref={ref} itemId={itemId} label={label} {...other} />
  }

  const customLabel =
    item.kind === 'season' ? (
      <SeasonTreeItem
        season={item.data as Season | CustomSeason}
        count={item.children?.length}
      />
    ) : (
      <EpisodeTreeItem
        episode={item.data as GenericEpisodeLite}
        onSelect={onSelect}
      />
    )

  return <TreeItem ref={ref} itemId={itemId} label={customLabel} {...other} />
}
