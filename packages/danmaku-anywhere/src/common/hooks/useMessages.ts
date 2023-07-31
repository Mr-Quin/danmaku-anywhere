import { useCallback, useEffect, useState } from 'react'

export const useMessageListener = <T = any>(listener: (request: T) => void) => {
  useEffect(() => {
    chrome.runtime.onMessage.addListener(listener)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [listener])
}

interface MessageSenderConfig {
  tabQuery?: chrome.tabs.QueryInfo
  skip?: boolean
  dependencies?: any[]
}

export const useMessageSender = (
  message: any,
  { tabQuery, skip = true, dependencies }: MessageSenderConfig = {}
) => {
  const [response, setResponse] = useState<any>(null)

  const handleSendMessage = useCallback(async () => {
    console.log('handleSendMessage', message)
    if (tabQuery) {
      const tabs = await chrome.tabs.query(tabQuery)
      const res = []
      for (const tab of tabs) {
        const r = await chrome.tabs.sendMessage(tab.id as number, message)
        res.push(r)
      }
      setResponse(res)
    } else {
      const res = await chrome.runtime.sendMessage(message)
      setResponse(res)
    }
  }, dependencies || [message, tabQuery])

  useEffect(() => {
    if (skip) return
    handleSendMessage()
  }, [handleSendMessage, skip])

  return {
    response,
    sendMessage: handleSendMessage,
  }
}
