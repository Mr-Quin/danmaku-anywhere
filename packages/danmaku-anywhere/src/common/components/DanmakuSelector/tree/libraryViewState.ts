import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { danmakuSourceTypeList } from '@/common/danmaku/enums'

export type LibraryViewState = 'tree' | 'empty' | 'noMatch'

interface LibraryViewInputs {
  visibleItemCount: number
  libraryItemCount: number
  filter: string
  typeFilter: DanmakuSourceType[]
}

export function libraryViewState({
  visibleItemCount,
  libraryItemCount,
  filter,
  typeFilter,
}: LibraryViewInputs): LibraryViewState {
  if (visibleItemCount > 0) {
    return 'tree'
  }
  const isFiltering =
    filter.trim() !== '' ||
    danmakuSourceTypeList.some((type) => !typeFilter.includes(type))
  if (libraryItemCount > 0 && isFiltering) {
    return 'noMatch'
  }
  return 'empty'
}
