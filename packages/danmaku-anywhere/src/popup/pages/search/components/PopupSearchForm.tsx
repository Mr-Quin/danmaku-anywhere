import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import { useState } from 'react'

import { SearchForm } from '@/common/components/SearchForm'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useStore } from '@/popup/store'

interface PopupSearchFormProps {
  onSearch: (params: DanDanAnimeSearchAPIParams) => void
  isLoading: boolean
}

export const PopupSearchForm = ({
  onSearch,
  isLoading,
}: PopupSearchFormProps) => {
  const {
    data: { searchUsingSimplified },
  } = useExtensionOptions()

  const { keyword, setKeyword } = useStore.use.search()

  const [localSearchUsingSimplified, setLocalSearchUsingSimplified] = useState(
    searchUsingSimplified
  )
  return (
    <SearchForm
      onSearch={(searchTerm) => {
        onSearch({ anime: searchTerm })
      }}
      isLoading={isLoading}
      useSimplified={localSearchUsingSimplified}
      onSimplifiedChange={(on) => setLocalSearchUsingSimplified(on)}
      searchTerm={keyword}
      onSearchTermChange={(searchTerm) => setKeyword(searchTerm)}
    />
  )
}
