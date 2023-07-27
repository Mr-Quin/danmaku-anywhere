import { useEffect } from 'preact/hooks'
import { useStore } from '../store/store'
import { debounce } from '../utils/debounce'
import { logger } from '../utils/logger'
import { Plex } from './plex/components/Plex'

const App = () => {
  const openDb = useStore.use.openDb()

  useEffect(() => {
    // listen for resize event and resize the danmaku instance
    const observer = new ResizeObserver(
      debounce(() => {
        const engine = useStore.getState().danmaku.engine
        if (engine) {
          logger.debug('Resizing danmaku engine'), engine.resize()
        }
      }, 200)
    )

    observer.observe(document.body)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    logger.debug('App loaded')
    openDb()
  }, [])

  return (
    <>
      <Plex />
    </>
  )
}

export default App
