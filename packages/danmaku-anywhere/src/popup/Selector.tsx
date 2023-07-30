import { useConst } from '@/common/hooks/useConst'
import { useMessageSender } from '@/common/hooks/useMessages'

export const Selector = () => {
  const { sendMessage } = useMessageSender(
    useConst({ action: 'startSelector' }),
    {
      tabQuery: useConst({ active: true, currentWindow: true }),
      skip: true,
    }
  )

  return (
    <div className="card">
      <button onClick={sendMessage}>Start Selector</button>
    </div>
  )
}
