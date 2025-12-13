import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragHandle } from '@mui/icons-material'
import {
  Box,
  Checkbox,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Switch,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'

interface SearchSettingsProps {
  showManageProvidersLink: boolean
  onClose: () => void
}

const SortableItem = ({
  id,
  name,
  enabled,
  onToggle,
}: {
  id: string
  name: string
  enabled: boolean
  onToggle: () => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      secondaryAction={
        <Box display="flex" alignItems="center">
          <Checkbox edge="end" checked={enabled} onChange={onToggle} />
          <IconButton
            {...attributes}
            {...listeners}
            edge="end"
            sx={{ cursor: 'grab', ml: 1 }}
          >
            <DragHandle />
          </IconButton>
        </Box>
      }
    >
      <ListItemText primary={name} />
    </ListItem>
  )
}

export const SearchSettings = ({
  showManageProvidersLink,
  onClose,
}: SearchSettingsProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()

  // We need to manage the order in the list.
  // The `configs` coming from useProviderConfig are already ordered.
  // Reordering via DnD should update the persistent config order.
  const { reorder, toggle } = useEditProviderConfig()

  const { data: extOptions, partialUpdate } = useExtensionOptions()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = configs.findIndex((item) => item.id === active.id)
      const newIndex = configs.findIndex((item) => item.id === over.id)
      reorder.mutate({ sourceIndex: oldIndex, destinationIndex: newIndex })
    }
  }

  return (
    <Box>
      <List>
        <ListItem
          secondaryAction={
            <Switch
              edge="end"
              checked={extOptions.searchUsingSimplified}
              onChange={(e) =>
                partialUpdate({
                  searchUsingSimplified: e.target.checked,
                })
              }
            />
          }
        >
          <ListItemText
            primary={t(
              'optionsPage.searchUsingSimplified',
              'Search using simplified Chinese'
            )}
          />
        </ListItem>
      </List>

      <Divider />

      <ListSubheader disableSticky>
        {t('providers.name', 'Danmaku Providers')}
      </ListSubheader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={configs.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <List>
            {configs.map((config) => (
              <SortableItem
                key={config.id}
                id={config.id}
                name={
                  config.isBuiltIn
                    ? t(localizedDanmakuSourceType(config.impl))
                    : config.name
                }
                enabled={config.enabled}
                onToggle={() =>
                  toggle.mutate({ id: config.id, enabled: !config.enabled })
                }
              />
            ))}
          </List>
        </SortableContext>
      </DndContext>

      {showManageProvidersLink && (
        <Box mt={2} textAlign="center">
          <Link component="button" variant="body2">
            {t('searchPage.settings.manageProviders', 'Manage Providers')}
          </Link>
        </Box>
      )}
    </Box>
  )
}
