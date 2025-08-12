import type { Manager } from '@mr-quin/danmu'
import type { DanmakuOptions } from '../DanmakuRenderer'
import type { ParsedComment } from '../parser'
import { useFixedDanmaku } from './fixedDanmaku'

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

const DURATION_MS = 5000
const DURATION_S = DURATION_MS / 1000

export const bindVideo =
  (
    video: HTMLMediaElement,
    comments: ParsedComment[],
    getConfig: () => DanmakuOptions
  ) =>
  (manager: Manager<ParsedComment>) => {
    const { plugin, getDanmakuOptions } = useFixedDanmaku(manager)

    // index of the next comment
    let cursor = 0
    // user-defined offset in seconds
    let offset = getConfig().offset / 1000

    const updateCursor = () => {
      // include danmaku that are within the duration range
      // so that we can "catch up" with the last
      cursor = binarySearch(comments, video.currentTime - offset - DURATION_S)
    }

    updateCursor()

    const emitDanmaku = (comment: ParsedComment, progress = 0) => {
      switch (comment.mode) {
        case 'rtl': {
          // since comments are time-sensitive, use unshift to prioritize the latest comment
          manager.unshift(comment, { progress })
          break
        }
        case 'ltr': {
          manager.unshift(comment, {
            direction: 'right',
            progress,
          })
          break
        }
        case 'top':
        case 'bottom': {
          if (manager.isFreeze()) {
            break
          }

          // check the render mode for the comment
          const config = getConfig().specialComments[comment.mode]
          if (config === 'normal') {
            manager.pushFlexibleDanmaku(comment, {
              duration: DURATION_MS,
              direction: 'none',
              ...getDanmakuOptions(comment.mode),
            })
          } else if (config === 'scroll') {
            manager.unshift({ ...comment, mode: 'rtl' }, { progress })
          }

          break
        }
      }
    }

    const handleTimeupdate = () => {
      const offsetTime = video.currentTime - offset

      if (cursor >= comments.length || comments[cursor].time > offsetTime) {
        return
      }

      while (cursor < comments.length) {
        const comment = comments[cursor]

        // return early if we haven't reached the comment time
        if (comment.time > offsetTime) {
          return
        }

        // for danmaku that are in the "past", set the progress so that they can start in the middle of the screen
        let progress = (offsetTime - comment.time) / DURATION_S
        if (progress < 0.1) {
          progress = 0
        }

        emitDanmaku(comment, progress)

        cursor++
      }
    }

    const handleSeek = () => {
      manager.clear()
      updateCursor()
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePause()
      } else if (document.visibilityState === 'visible') {
        // when the page becomes visible, we need to clear the screen and update the cursor, then resume playing
        handleSeek()
        if (!video.paused) {
          handlePlay()
        }
      }
    }

    video.addEventListener('timeupdate', handleTimeupdate)
    video.addEventListener('seeking', handleSeek)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handlePause)
    video.addEventListener('play', handlePlay)
    video.addEventListener('playing', handlePlay)

    document.addEventListener('visibilitychange', handleVisibilityChange)

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
      updateOptions() {
        // the offset changes only when the config changes
        if (getConfig().offset !== offset) {
          offset = getConfig().offset / 1000
          updateCursor()
          manager.clear()
        }
      },
    })
    manager.use(plugin)
  }
