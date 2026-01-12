import { Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useAllSeasonMap } from '@/common/seasonMap/queries/useAllSeasonMap'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { TitleMappingDetails } from './TitleMappingDetails'
import { TitleMappingList } from './TitleMappingList'

type TitleMappingPageCoreProps = {
  onGoBack?: () => void
  showBackButton?: boolean
}

export const TitleMappingPageCore = ({
  onGoBack,
  showBackButton,
}: TitleMappingPageCoreProps) => {
  const { t } = useTranslation()
  const { data: mappings } = useAllSeasonMap()
  const [selectedMapping, setSelectedMapping] = useState<SeasonMap | null>(null)

  const handleBack = () => {
    if (selectedMapping) {
      setSelectedMapping(null)
    } else {
      onGoBack?.()
    }
  }

  const activeMapping = selectedMapping
    ? mappings.find((m) => m.key === selectedMapping.key) || null
    : null

  useEffect(() => {
    if (selectedMapping && !activeMapping) {
      setSelectedMapping(null)
    }
  }, [selectedMapping, activeMapping])

  return (
    <TabLayout>
      <TabToolbar
        title={
          activeMapping
            ? activeMapping.key
            : t('titleMapping.title', 'Title Mappings')
        }
        onGoBack={handleBack}
        showBackButton={showBackButton || !!activeMapping}
      />
      {activeMapping ? (
        <TitleMappingDetails map={activeMapping} />
      ) : mappings.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center">
          {t('titleMapping.empty', 'No title mappings found.')}
        </Typography>
      ) : (
        <TitleMappingList
          mappings={mappings}
          onSelect={(map) => setSelectedMapping(map)}
        />
      )}
    </TabLayout>
  )
}
