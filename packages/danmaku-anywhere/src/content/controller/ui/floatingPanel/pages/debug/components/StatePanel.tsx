import { Box, Typography } from '@mui/material'
import { useDialogStore } from '@/common/components/Dialog/dialogStore'
import { useToast } from '@/common/components/Toast/toastStore'
import { useStore } from '@/content/controller/store/store'

// biome-ignore lint/suspicious/noExplicitAny: debug serialization
const JsonBlock = ({ title, data }: { title: string; data: any }) => (
  <Box mb={2}>
    <Typography
      variant="overline"
      color="primary"
      fontWeight="bold"
      letterSpacing={1}
      pl={0.5}
    >
      {title}
    </Typography>
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        fontSize: 10,
        fontFamily: 'monospace',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'auto',
        color: 'text.secondary',
        '& span.key': { color: 'primary.main' },
        '& span.string': { color: 'success.main' },
        '& span.number': { color: 'warning.main' },
        '& span.boolean': { color: 'info.main' },
      }}
    >
      {JSON.stringify(data, null, 2)}
    </Box>
  </Box>
)

export const StatePanel = () => {
  const danmaku = useStore.use.danmaku()
  const integration = useStore.use.integration()
  const integrationForm = useStore.use.integrationForm()
  const isDisconnected = useStore.use.isDisconnected()
  const activeFrame = useStore((s) => s.frame.activeFrame)
  const toastState = useToast()
  const { dialogs, closingIds, loadingIds } = useDialogStore()

  // Build a nice serialized version of state
  const generalState = {
    isDisconnected,
    hasVideo: activeFrame?.hasVideo ?? false,
  }

  const cleanDanmakuState = {
    ...danmaku,
    comments: `[Array(${danmaku.comments.length})]`,
    episodes: danmaku.episodes ? `[Array(${danmaku.episodes.length})]` : null,
  }

  return (
    <Box p={1}>
      <JsonBlock title="General" data={generalState} />
      <JsonBlock title="Danmaku" data={cleanDanmakuState} />
      <JsonBlock title="Integration" data={integration} />
      <JsonBlock title="Integration Form" data={integrationForm} />
      <JsonBlock title="Toasts" data={toastState.toast} />
      <JsonBlock
        title="Dialogs"
        data={{ dialogs: Object.keys(dialogs), closingIds, loadingIds }}
      />
    </Box>
  )
}
