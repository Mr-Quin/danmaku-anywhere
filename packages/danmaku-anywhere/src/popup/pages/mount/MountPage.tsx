import { useMutation, useQuery } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { MountPageContent } from '@/common/components/DanmakuSelector/MountPageContent'
import { useToast } from '@/common/components/Toast/toastStore'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { controllerRpcClient } from '@/common/rpcClient/controller/client'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { useMountDanmakuPopup } from '@/popup/pages/mount/useMountDanmakuPopup'
import { useStore } from '@/popup/store'

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

  const navigate = useNavigate()

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

  function handleGoSearch() {
    navigate('/search')
  }

  function handleGoCreateMountConfig() {
    navigate('/config')
  }

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
      onGoSearch={handleGoSearch}
      onGoCreateMountConfig={handleGoCreateMountConfig}
    />
  )
}
