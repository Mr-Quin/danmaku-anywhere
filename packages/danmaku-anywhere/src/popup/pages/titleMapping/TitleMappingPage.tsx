import { useLocation } from 'react-router'
import { TitleMappingPageCore } from '@/common/components/TitleMapping/TitleMappingPageCore'
import { useGoBack } from '@/popup/hooks/useGoBack'

export const TitleMappingPage = () => {
  const goBack = useGoBack()
  const { state } = useLocation()
  const showBack = state?.from

  return <TitleMappingPageCore onGoBack={goBack} showBackButton={!!showBack} />
}
