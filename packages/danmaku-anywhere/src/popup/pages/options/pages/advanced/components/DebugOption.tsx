import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ToggleListItemButton } from '@/popup/pages/options/components/ToggleListItemButton'

export const DebugOption = () => {
  const { data, partialUpdate, isLoading } = useExtensionOptions()

  const handleToggle = async () => {
    await partialUpdate({ debug: !data.debug })
  }

  return (
    <ToggleListItemButton
      enabled={data.debug}
      onToggle={handleToggle}
      onClick={handleToggle}
      itemText="Debug"
      isLoading={isLoading}
    />
  )
}
