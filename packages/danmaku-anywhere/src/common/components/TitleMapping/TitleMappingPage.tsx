import { useLocation } from 'react-router'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { TitleMappingPageCore } from './TitleMappingPageCore'

export const TitleMappingPage = () => {
  const goBack = useGoBack()
  const { state } = useLocation()
  const showBack = state?.from

  return <TitleMappingPageCore onGoBack={goBack} showBackButton={!!showBack} />
}
