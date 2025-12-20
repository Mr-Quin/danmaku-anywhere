import { FilterPageCore as FilterPageCore } from '@/common/components/DanmakuFilter/FilterPageCore'
import { PopupTab, usePopup } from '@/content/controller/store/popupStore'

export const FilterPage = () => {
  const { setTab } = usePopup()

  return <FilterPageCore onGoBack={() => setTab(PopupTab.Styles)} />
}
