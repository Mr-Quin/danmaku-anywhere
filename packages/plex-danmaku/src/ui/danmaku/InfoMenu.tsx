import { SectionHeader } from './SectionHeader'
import { PopupPanelWrapper } from './PopupPanelWrapper'
import styles from './panel.module.scss'
import { useDanmaku } from '@/store/store'
import { parseDanDanCommetParams } from '@/danmaku/parser'

const timeToHMS = (time: number) => {
  const h = Math.floor(time / 3600)
  const m = Math.floor((time % 3600) / 60)
  const s = Math.floor(time % 60)
    .toString()
    .padStart(2, '0')

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s}`
  }

  return `${m}:${s}`
}

export const InfoMenu = () => {
  const { comments } = useDanmaku()

  const parsedComments = comments
    ?.map((comment) => {
      const { time } = parseDanDanCommetParams(comment.p)
      return {
        message: comment.m,
        time,
      }
    })
    .sort((a, b) => a.time - b.time)

  // TODO: virtualize the list
  return (
    <PopupPanelWrapper>
      <SectionHeader>Comments</SectionHeader>
      <div className={styles.danmakuListWrapper}>
        {!parsedComments?.length && <div>No comments loaded</div>}
        {parsedComments?.length && (
          <div>{parsedComments.length} Comments loaded</div>
        )}
        {parsedComments?.map(({ time, message }, index) => {
          return (
            <div className={styles.danmakuEntry} key={index}>
              <div className={styles.time}>{timeToHMS(time)}</div>
              <div className={styles.message} title={message}>
                {message}
              </div>
            </div>
          )
        })}
      </div>
    </PopupPanelWrapper>
  )
}
