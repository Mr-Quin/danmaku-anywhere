import { useParams } from 'react-router'

import { EpisodeList } from './EpisodeList'

import { useGetSeasonSuspense } from '@/common/anime/queries/useSeasonsSuspense'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'

export const EpisodePage = () => {
  const goBack = useGoBack()

  const params = useParams()

  const seasonId = params.seasonId ? parseInt(params.seasonId) : 0

  const {
    data: [season],
  } = useGetSeasonSuspense({
    id: seasonId,
  })

  return (
    <TabLayout>
      <TabToolbar title={season.title} showBackButton onGoBack={goBack}>
        <DrilldownMenu ButtonProps={{ edge: 'end' }}></DrilldownMenu>
      </TabToolbar>
      <EpisodeList />
    </TabLayout>
  )
}
