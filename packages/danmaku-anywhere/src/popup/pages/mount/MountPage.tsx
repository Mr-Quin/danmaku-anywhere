import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { ChecklistRtl, Keyboard } from '@mui/icons-material'
import { Button, IconButton, Tooltip } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import {
  DanmakuSelector,
  type DanmakuSelectorApi,
} from '@/common/components/DanmakuSelector/DanmakuSelector'
import { FilterButton } from '@/common/components/FilterButton'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useToast } from '@/common/components/Toast/toastStore'
import { TypeSelector } from '@/common/components/TypeSelector'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { controllerRpcClient } from '@/common/rpcClient/controller/client'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { HasDanmaku } from '@/popup/pages/mount/components/HasDanmaku'
import { useMountDanmakuPopup } from '@/popup/pages/mount/useMountDanmakuPopup'
import { useStore } from '@/popup/store'

export const MountPage = () => {
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

  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const isConnected = useIsConnected()
  const selectorRef = useRef<DanmakuSelectorApi>(null)

  const tabDanmakuState = useQuery({
    queryKey: tabQueryKeys.getState(),
    queryFn: () => controllerRpcClient.danmakuGetState(),
    select: (res) => res.data,
    retry: false,
  })

  useEffect(() => {
    if (tabDanmakuState.data?.danmaku) {
      setIsMounted(tabDanmakuState.data.manual)
    }
  }, [tabDanmakuState.data])

  const { mutate: unmount } = useMutation({
    mutationFn: controllerRpcClient.danmakuUnmount,
    mutationKey: tabQueryKeys.getState(),
    onSuccess: () => {
      setIsMounted(false)
      setFilter('')
      toast.success(t('danmaku.alert.unmounted'))
    },
    onError: (e) => {
      toast.error(`${(e as Error).message}`)
    },
  })

  const { mutate, isPending: isMounting } = useMountDanmakuPopup()

  const handleMount = async (episode: GenericEpisodeLite) => {
    mutate(
      { filter: { id: episode.id }, provider: episode.provider },
      {
        onSuccess: () => {
          setIsMounted(true)
        },
      }
    )
  }

  const handleMountMultiple = async () => {
    if (!selectorRef.current || !multiselect) return

    const episodes = selectorRef.current.getSelectedEpisodes()
    if (episodes.length > 0) {
      void handleMount(episodes[0])
    }
    selectorRef.current.clearSelection()
    toggleMultiselect()
  }

  return (
    <TabLayout>
      <CaptureKeypress
        onChange={setFilter}
        value={filter}
        disabled={isFilterOpen}
        autoFocus
        boxProps={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {({ focused, disabled }) => {
          return (
            <>
              <TabToolbar title={t('mountPage.pageTitle')}>
                {!isMobile && (
                  <Keyboard
                    color={disabled || !focused ? 'disabled' : 'action'}
                  />
                )}
                <FilterButton
                  onChange={setFilter}
                  filter={filter}
                  open={isFilterOpen}
                  onOpen={() => setIsFilterOpen(true)}
                  onClose={() => setIsFilterOpen(false)}
                />
                <TypeSelector
                  selectedTypes={selectedTypes}
                  setSelectedType={setSelectedType}
                />
                <Tooltip title={t('common.multiselect')}>
                  <IconButton
                    onClick={() => {
                      selectorRef.current?.clearSelection()
                      toggleMultiselect()
                    }}
                    color={multiselect ? 'primary' : 'default'}
                  >
                    <ChecklistRtl />
                  </IconButton>
                </Tooltip>
                {multiselect ? (
                  <Button
                    variant="outlined"
                    type="button"
                    onClick={() => handleMountMultiple()}
                    color="primary"
                    disabled={!multiselect}
                  >
                    {t('danmaku.mount')}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    type="button"
                    onClick={() => unmount()}
                    color="warning"
                    disabled={!isMounted}
                  >
                    {t('danmaku.unmount')}
                  </Button>
                )}
              </TabToolbar>
              <Suspense fallback={<FullPageSpinner />}>
                <HasDanmaku>
                  <DanmakuSelector
                    ref={selectorRef}
                    filter={filter}
                    typeFilter={selectedTypes}
                    onSelect={handleMount}
                    disabled={!isConnected || isMounting}
                    multiselect={multiselect}
                  />
                </HasDanmaku>
              </Suspense>
            </>
          )
        }}
      </CaptureKeypress>
    </TabLayout>
  )
}
