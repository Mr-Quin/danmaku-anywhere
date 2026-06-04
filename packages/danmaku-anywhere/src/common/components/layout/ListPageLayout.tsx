import type { PropsWithChildren, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ListAddButton } from '@/common/components/ListAddButton'
import { TabBody } from './TabBody'
import { TabLayout } from './TabLayout'
import { TabToolbar } from './TabToolbar'

type ListPageLayoutProps = {
  title?: ReactNode
  onAdd?: () => void
  action?: ReactNode
  gutters?: number
} & PropsWithChildren

export function ListPageLayout({
  title,
  onAdd,
  action,
  gutters = 2,
  children,
}: ListPageLayoutProps) {
  const { t } = useTranslation()

  const renderAction = () => {
    if (action) {
      return action
    }
    if (onAdd) {
      return (
        <ListAddButton onClick={onAdd}>{t('common.add', 'Add')}</ListAddButton>
      )
    }
    return null
  }

  return (
    <TabLayout>
      <TabToolbar title={title}>{renderAction()}</TabToolbar>
      <TabBody gutters={gutters}>{children}</TabBody>
    </TabLayout>
  )
}
