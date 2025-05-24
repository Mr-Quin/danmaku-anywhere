import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MountController } from './components/MountController'

import { CaptureKeypress } from '@/common/components/CaptureKeypress'
import { FilterButton } from '@/common/components/FilterButton'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useToast } from '@/common/components/Toast/toastStore'
import { TypeSelector } from '@/common/components/TypeSelector'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { tabQueryKeys } from '@/common/queries/queryKeys'
import { tabRpcClient } from '@/common/rpcClient/tab/client'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { HasDanmaku } from '@/popup/pages/mount/components/HasDanmaku'
import { useStore } from '@/popup/store'
import { Keyboard } from '@mui/icons-material'
import { Button } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'

export const MountPage = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { setFilter, filter, setIsMounted, isMounted } = useStore.use.mount()
  const { selectedTypes, setSelectedType } = useStore.use.danmaku()

  const { isMobile } = usePlatformInfo()

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const tabDanmakuState = useQuery({
    queryKey: tabQueryKeys.getState(),
    queryFn: () => tabRpcClient.danmakuGetState(),
    select: (res) => res.data,
    retry: false,
  })

  useEffect(() => {
    if (tabDanmakuState.data?.danmaku) {
      setIsMounted(tabDanmakuState.data.manual)
    }
  }, [tabDanmakuState.data])

  const { mutate: unmount } = useMutation({
    mutationFn: tabRpcClient.danmakuUnmount,
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
                <Button
                  variant="outlined"
                  type="button"
                  onClick={() => unmount()}
                  color="warning"
                  disabled={!isMounted}
                >
                  {t('danmaku.unmount')}
                </Button>
              </TabToolbar>
              <Suspense fallback={<FullPageSpinner />}>
                <HasDanmaku>
                  <MountController />
                </HasDanmaku>
              </Suspense>
            </>
          )
        }}
      </CaptureKeypress>
    </TabLayout>
  )
}
