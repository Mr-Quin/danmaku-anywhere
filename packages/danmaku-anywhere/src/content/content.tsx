import { useEffect, useState } from 'react'
import { DanmakuManager } from './DanmakuManager'
import { DomSelector } from './DomSelector'
import { useMessageListener } from '@/common/hooks/useMessages'

const useSelector = () => {
  const [isEnabled, setIsEnabled] = useState(false)

  useMessageListener((request: any) => {
    if (request.action === 'startSelector') {
      // start the inspector mode
      console.log('start inspector')
      setIsEnabled(true)
    }
  })

  // cancel the selector on escape
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEnabled(false)
      }
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [isEnabled])

  return { isEnabled, disableSelector: () => setIsEnabled(false) }
}
export const Content = () => {
  const { isEnabled, disableSelector } = useSelector()

  const onSelect = (el: HTMLElement) => {
    disableSelector()
    console.log(el)
  }

  console.log(location.href)

  return (
    <>
      <div>Hello World</div>
      <DanmakuManager />
      <DomSelector enable={isEnabled} onSelect={onSelect} />
    </>
  )
}
