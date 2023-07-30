import { useMessageSender } from '@/common/hooks/useMessages'
import { useSessionState } from '@/common/hooks/useSessionState'

export interface DanmakuStartMessage {
  action: 'danmaku/start'
  payload: {
    mediaQuery: string
    containerQuery: string
    episodeId: number
  }
}

export const DanmakuController = () => {
  const [mediaQuery, setMediaQuery] = useSessionState('', 'mediaQuery')
  const [containerQuery, setContainerQuery] = useSessionState(
    '',
    'containerQuery'
  )
  const [episodeId, setEpisodeId] = useSessionState(0, 'controller/episodeId')

  const { sendMessage } = useMessageSender(
    {
      action: 'danmaku/start',
      payload: {
        containerQuery,
        mediaQuery,
        episodeId,
      },
    },
    {
      skip: true,
      tabQuery: { active: true, currentWindow: true },
    }
  )

  return (
    <div className="card">
      <label>Media Query</label>
      <input
        type="text"
        value={mediaQuery}
        onChange={(e) => setMediaQuery(e.target.value)}
      />
      <label>Container Query</label>
      <input
        type="text"
        value={containerQuery}
        onChange={(e) => setContainerQuery(e.target.value)}
      />
      <label>Episode Id</label>
      <input
        type="text"
        value={episodeId}
        onChange={(e) => setEpisodeId(Number(e.target.value))}
      />
      <button onClick={sendMessage}>Start</button>
    </div>
  )
}
