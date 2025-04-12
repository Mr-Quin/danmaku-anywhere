import { Manager } from 'danmu'
import { DanmakuOptions } from './DanmakuRenderer'
import { useFixedDanmaku } from './fixedDanmaku'
import { ParsedComment } from './parser'

const binarySearch = (comments: ParsedComment[], time: number): number => {
  let low = 0
  let high = comments.length - 1
  let ans = comments.length

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const commentTime = comments[mid].time

    if (commentTime >= time) {
      ans = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return ans
}

export const bindVideo =
  (
    video: HTMLMediaElement,
    comments: ParsedComment[],
    getConfig: () => DanmakuOptions['specialComments']
  ) =>
  (manager: Manager<ParsedComment>) => {
    // index of the next comment
    let cursor = binarySearch(comments, video.currentTime)

    const { plugin, getDanmakuOptions } = useFixedDanmaku(manager)

    const handleTimeupdate = () => {
      const currentTime = video.currentTime

      if (cursor >= comments.length) {
        return
      }

      if (comments[cursor].time > currentTime) {
        return
      }

      while (cursor < comments.length) {
        const comment = comments[cursor]

        // return early if we haven't reached the comment time
        if (comment.time > currentTime) {
          return
        }

        switch (comment.mode) {
          case 'rtl': {
            // since comments are time-sensitive, use unshift to prioritize the latest comment
            manager.unshift(comment)
            break
          }
          case 'ltr': {
            manager.unshift(comment, { direction: 'right' })
            break
          }
          case 'top':
          case 'bottom': {
            if (manager.isFreeze()) {
              break
            }

            // check the render mode for the comment
            const config = getConfig()[comment.mode]
            if (config === 'normal') {
              manager.pushFlexibleDanmaku(comment, {
                duration: 5000,
                direction: 'none',
                ...getDanmakuOptions(comment.mode),
              })
            } else if (config === 'scroll') {
              manager.unshift({ ...comment, mode: 'rtl' })
            }

            break
          }
        }

        cursor++
      }
    }

    const handleSeek = () => {
      const seekTime = video.currentTime
      manager.clear()
      cursor = binarySearch(comments, seekTime)
      handleTimeupdate()
    }

    const handlePause = () => {
      manager.freeze()
      manager.stopPlaying()
    }

    const handlePlay = () => {
      if (manager.isFreeze()) {
        manager.unfreeze()
      }
      manager.startPlaying()
      handleTimeupdate()
    }

    video.addEventListener('timeupdate', handleTimeupdate)
    video.addEventListener('seeking', handleSeek)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handlePause)
    video.addEventListener('play', handlePlay)
    video.addEventListener('playing', handlePlay)

    manager.use({
      name: 'bind-video',
      unmount() {
        video.removeEventListener('timeupdate', handleTimeupdate)
        video.removeEventListener('seeking', handleSeek)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('playing', handlePlay)
        video.removeEventListener('pause', handlePause)
        video.removeEventListener('waiting', handlePause)
      },
    })
    manager.use(plugin)
  }
