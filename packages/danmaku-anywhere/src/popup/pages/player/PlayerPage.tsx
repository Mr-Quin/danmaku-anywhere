import { TabLayout } from '@/content/common/TabLayout'
import { DPlayerComponent } from '@/popup/pages/player/DPlayerComponent'
import { Button, TextField } from '@mui/material'
import { useState } from 'react'

type UrlData = {
  url: string
  source: string
}

const scrapeVideoUrl = (): UrlData | null => {
  // heuristic to extract the video url
  const w: any = window

  // 1. try to grab it from global variables
  if (w.player_aaaa) {
    return {
      url: w.player_aaaa.url as string,
      source: 'player',
    }
  }

  if (w.dplayer) {
    console.log('dplayer', w.dplayer)
  }

  const video = document.querySelector('video')

  if (video) {
    if (!video.src.startsWith('blob')) {
      return {
        url: video.src,
        source: 'video',
      }
    }
  }
  return null
}

export const PlayerPage = () => {
  const [text, setText] = useState('')

  const [urlCandidates, setUrlCandidates] = useState<UrlData[]>([])
  const [videoUrl, setVideoUrl] = useState<string>()

  const addUrl = (url: UrlData) => {
    setUrlCandidates((prev) => [...prev, url])
  }

  const handlePlay = () => {
    setVideoUrl(urlCandidates[0].url)
  }

  const handleClick = async () => {
    const tab = await chrome.tabs.create({
      active: false,
      url: text,
    })

    console.log(tab)
    if (!tab.id) return

    const tabId = tab.id

    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        const reg = /([%.])(mp4|m3u8|flv|webm)/
        console.log('request', details.url, { details })
        if (reg.test(details.url)) {
          addUrl({
            url: details.url,
            source: 'request',
          })
        }
      },
      {
        tabId,
        urls: ['<all_urls>'],
      },
      ['requestHeaders']
    )

    chrome.webRequest.onHeadersReceived.addListener(
      (details) => {
        console.log('response', details.url, { details })
      },
      {
        tabId,
        urls: ['<all_urls>'],
      },
      ['responseHeaders']
    )

    chrome.tabs.create({})
    chrome.webNavigation.onCompleted()

    chrome.scripting.executeScript({
      func:...
    })
    chrome.tabs.remove()

    let interval: NodeJS.Timeout | undefined
    let count = 0

    const getUrl = async () => {
      count += 1
      if (count > 30) {
        clearInterval(interval)
        return
      }
      const results = await chrome.scripting.executeScript<
        unknown[],
        UrlData | null
      >({
        target: { tabId, allFrames: true },
        func: scrapeVideoUrl,
        world: 'MAIN',
      })

      const url = results.find((r) => r.result)?.result

      if (url) {
        addUrl(url)
      }

      console.log({ results })
    }

    interval = setInterval(getUrl, 1000)

    // await sleep(1000)
    //
    // const port = chrome.tabs.connect(tab.id)
    //
    // port.onMessage.addListener((msg) => {
    //   console.log({ msg })
    // })

    // await chrome.tabs.remove(tab.id)
  }

  return (
    <TabLayout>
      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        label="test"
        variant="outlined"
        fullWidth
      />
      <Button
        onClick={() => {
          handleClick()
        }}
      >
        Go
      </Button>
      {videoUrl && <DPlayerComponent videoUrl={videoUrl} autoplay />}
      {JSON.stringify(urlCandidates, null, 2)}
      <Button
        onClick={() => {
          handlePlay()
        }}
      >
        Play
      </Button>
    </TabLayout>
  )
}
