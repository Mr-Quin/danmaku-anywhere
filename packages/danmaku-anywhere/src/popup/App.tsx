import { Toast } from '@/common/components/Toast/Toast'
import { LoadInitialData } from '@/popup/component/LoadInitialData'
import { PopupLayout } from './layout/PopupLayout'
import { RootRouter } from './router/RootRouter'

export const App = () => {
  return (
    <PopupLayout>
      <LoadInitialData>
        <Toast
          snackbarProps={{
            anchorOrigin: {
              vertical: 'top',
              horizontal: 'center',
            },
          }}
        />
        <RootRouter />
      </LoadInitialData>
    </PopupLayout>
  )
}
