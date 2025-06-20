import { getVideoUrlFromResponse } from './cat-catch.js'
// polyfill for firefox
import 'core-js/es/disposable-stack'
import 'core-js/es/async-disposable-stack'
import 'core-js/es/iterator/dispose'
import 'core-js/es/async-iterator/async-dispose'
import 'core-js/es/symbol/async-dispose'
import 'core-js/es/symbol/dispose'
import type { HTTPHeader } from './types.js'
import { createTab, Logger } from './utils.js'

export type MediaInfo = {
  src: string
  contentType: string
  type: 'video' | 'audio'
  headers?: HTTPHeader[]
}

export type MediaExtractionOptions = {
  onMediaFound: (mediaInfo: MediaInfo) => void
  onError: (error: Error) => void
  onComplete?: () => void
}

export const extractMedia = async (
  url: string,
  options: MediaExtractionOptions
): Promise<() => void> => {
  const { onMediaFound, onError, onComplete } = options
  const tabResource = await createTab(url)
  const { tabId } = tabResource

  Logger.debug('Initiating media extraction for:', url)

  const requests = new Map<string, chrome.webRequest.HttpHeader[]>()
  const mediaInfos = new Set<string>()

  const cleanupStack: (() => void)[] = []

  const cleanup = () => {
    Logger.debug('Cleaning up resources for tab:', tabId)
    cleanupStack.forEach((cb) => cb())
    tabResource[Symbol.asyncDispose]()
    if (onComplete) {
      onComplete()
    }
  }

  const requestListener = (
    details: chrome.webRequest.WebRequestHeadersDetails
  ) => {
    if (details.requestHeaders) {
      requests.set(details.requestId, details.requestHeaders)
    }
  }

  const responseListener = (
    details: chrome.webRequest.WebResponseHeadersDetails
  ) => {
    const videoInfo = getVideoUrlFromResponse(details)

    if (videoInfo && !mediaInfos.has(videoInfo.src)) {
      const headers = requests.get(details.requestId)
      Logger.debug('Found media from response:', videoInfo, details)

      const media: MediaInfo = {
        ...videoInfo,
        headers,
      }

      mediaInfos.add(videoInfo.src)
      onMediaFound(media)
    }
  }

  chrome.webRequest.onSendHeaders.addListener(
    requestListener,
    { tabId, urls: ['<all_urls>'] },
    ['requestHeaders']
  )
  cleanupStack.push(() =>
    chrome.webRequest.onSendHeaders.removeListener(requestListener)
  )

  chrome.webRequest.onResponseStarted.addListener(
    responseListener,
    { tabId, urls: ['<all_urls>'] },
    ['responseHeaders']
  )
  cleanupStack.push(() =>
    chrome.webRequest.onResponseStarted.removeListener(responseListener)
  )

  const tabRemovedListener = (_tabId: number) => {
    if (_tabId === tabId) {
      onError(new Error('The tab was closed during media extraction.'))
      cleanup()
    }
  }

  chrome.tabs.onRemoved.addListener(tabRemovedListener)
  cleanupStack.push(() =>
    chrome.tabs.onRemoved.removeListener(tabRemovedListener)
  )

  return cleanup
}
