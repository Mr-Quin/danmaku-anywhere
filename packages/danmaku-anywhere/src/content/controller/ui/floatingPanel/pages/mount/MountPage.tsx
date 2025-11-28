import type { ReactElement } from 'react'
import { useState } from 'react'

import { MountPageContent } from '@/common/components/DanmakuSelector/MountPageContent'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { useMountDanmakuContent } from '@/content/controller/ui/floatingPanel/pages/mount/useMountDanmakuContent'

export const MountPage = (): ReactElement => {
  const { filter, setFilter } = useStore.use.danmaku()
  const selectedProviders = usePopup.use.selectedProviders()
  const setSelectedProviders = usePopup.use.setSelectedProviders()

  const [multiselect, setMultiselect] = useState(false)

  const { mutate, isPending } = useMountDanmakuContent()

  return (
    <MountPageContent
      filter={filter}
      onFilterChange={setFilter}
      selectedTypes={selectedProviders}
      onSelectedTypesChange={setSelectedProviders}
      multiselect={multiselect}
      onToggleMultiselect={() => setMultiselect((prev) => !prev)}
      onMount={mutate}
      isMounting={isPending}
    />
  )
}
