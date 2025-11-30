import { useMutation, useQuery } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { MountPageContent } from '@/common/components/DanmakuSelector/MountPageContent'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useToast } from '@/common/components/Toast/toastStore'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { controllerRpcClient } from '@/common/rpcClient/controller/client'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { HasDanmaku } from '@/popup/pages/mount/components/HasDanmaku'
import { useMountDanmakuPopup } from '@/popup/pages/mount/useMountDanmakuPopup'
import { useStore } from '@/popup/store'

const PopupSelectorWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<FullPageSpinner />}>
    <HasDanmaku>{children}</HasDanmaku>
  </Suspense>
)

export const MountPage = (): ReactElement => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const {
    setFilter,
    filter,
    setIsMounted,
    isMounted,
    toggleMultiselect,
    multiselect,
  } = useStore.use.mount()
  const { selectedTypes, setSelectedType } = useStore.use.danmaku()

  const isConnected = useIsConnected()

  const tabDanmakuState = useQuery({
    queryKey: tabQueryKeys.getState(),
    queryFn: () => controllerRpcClient.danmakuGetState(),
    select: (res) => res.data,
    retry: false,
  })

  useEffect(() => {
    if (tabDanmakuState.data?.isMounted) {
      setIsMounted(tabDanmakuState.data.manual)
    }
  }, [tabDanmakuState.data])

  const { mutate: unmount } = useMutation({
    mutationFn: () => controllerRpcClient.danmakuUnmount(),
    mutationKey: tabQueryKeys.getState(),
    onSuccess: () => {
      setIsMounted(false)
      setFilter('')
      toast.success(t('danmaku.alert.unmounted', 'Danmaku Unmounted'))
    },
    onError: (e) => {
      toast.error(`${(e as Error).message}`)
    },
  })

  const { mutate, isPending: isMounting } = useMountDanmakuPopup()

  return (
    <MountPageContent
      filter={filter}
      onFilterChange={setFilter}
      selectedTypes={selectedTypes}
      onSelectedTypesChange={setSelectedType}
      multiselect={multiselect}
      onToggleMultiselect={toggleMultiselect}
      onMount={mutate}
      isMounting={isMounting}
      onUnmount={() => unmount()}
      isMounted={isMounted}
      isConnected={isConnected}
      selectorWrapper={PopupSelectorWrapper}
    />
  )
}
