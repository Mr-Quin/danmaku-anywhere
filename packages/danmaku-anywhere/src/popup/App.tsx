import { Toast } from '@/common/components/Toast/Toast'
import { LoadInitialData } from '@/popup/component/LoadInitialData'
import { useEnvironment } from '@/popup/context/Environment'
import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'

export const App = () => {
  const { isPopup } = useEnvironment()

  return (
    <PopupLayout>
      <LoadInitialData>
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
