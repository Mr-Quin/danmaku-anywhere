import { Toast } from '@/common/components/Toast/Toast'
import { useThemeContext } from '@/common/theme/Theme'
import { useEnvironment } from '@/content/common/context/Environment'
import { LoadInitialData } from '@/popup/component/LoadInitialData'
import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'

export const App = () => {
  const { isPopup } = useEnvironment()
  const { colorScheme } = useThemeContext()

  return (
    <PopupLayout>
      <LoadInitialData>
        <meta name="color-scheme" content={colorScheme} />
        <Toast
          stackable={!isPopup}
          disableCloseOnClickAway={!isPopup}
          snackbarProps={
            isPopup
              ? {
                  anchorOrigin: {
                    vertical: 'top',
                    horizontal: 'center',
                  },
                }
              : {}
          }
        />
        <RootRouter />
      </LoadInitialData>
    </PopupLayout>
  )
}
