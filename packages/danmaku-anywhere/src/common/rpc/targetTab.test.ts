import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { tabSender } from './sender'
import {
  buildDetachedPopupUrl,
  findTargetTab,
  readTargetTabId,
  resolveTargetTab,
} from './targetTab'

/**
 * Which tab the popup talks to. The action popup targets the active tab of the
 * current window; a popup page opened in its own window or tab is the active
 * tab itself there, so it targets the tab id it was opened with. Asserts the
 * id round-trips through the detached popup URL along with the route, and
 * that tab RPCs from such a page reach that tab rather than the page itself.
 */

function stubPopupLocation(query: string) {
  vi.stubGlobal(
    'location',
    new URL(chrome.runtime.getURL(`pages/popup.html${query}#/mount`))
  )
}

async function openTabs() {
  const browserWindow = await fakeBrowser.windows.create({ focused: true })
  const windowId = browserWindow?.id
  const video = await fakeBrowser.tabs.create({
    windowId,
    url: 'https://video.example/watch',
    active: false,
  })
  const popupPage = await fakeBrowser.tabs.create({
    windowId,
    url: chrome.runtime.getURL('pages/popup.html?detached=1'),
    active: true,
  })
  return { video, popupPage }
}

describe('readTargetTabId', () => {
  it('reads a tab id', () => {
    expect(readTargetTabId('?detached=1&tabId=42')).toBe(42)
  })

  it.each([
    '',
    '?detached=1',
    '?tabId=',
    '?tabId=abc',
    '?tabId=-1',
  ])('ignores %j', (search) => {
    expect(readTargetTabId(search)).toBeUndefined()
  })
})

describe('buildDetachedPopupUrl', () => {
  it('keeps the route and the originating tab', () => {
    const url = new URL(buildDetachedPopupUrl('/search?q=frieren', 7))

    expect(url.searchParams.get('detached')).toBe('1')
    expect(readTargetTabId(url.search)).toBe(7)
    expect(url.hash).toBe('#/search?q=frieren')
  })

  it('omits the tab id when there is none', () => {
    const url = new URL(buildDetachedPopupUrl('import'))

    expect(url.search).toBe('?detached=1')
    expect(url.hash).toBe('#/import')
  })
})

describe('target tab resolution', () => {
  it('uses the given tab even when another tab is active', async () => {
    const { video } = await openTabs()

    expect((await findTargetTab(video.id))?.url).toBe(video.url)
  })

  it('falls back to the active tab without a tab id', async () => {
    const { popupPage } = await openTabs()

    expect((await findTargetTab(undefined))?.id).toBe(popupPage.id)
  })

  it('finds nothing when the originating tab is gone', async () => {
    await openTabs()

    expect(await findTargetTab(9999)).toBeUndefined()
  })

  it('targets the originating tab from a detached popup page', async () => {
    const { video } = await openTabs()
    stubPopupLocation(`?detached=1&tabId=${video.id}`)

    expect((await resolveTargetTab())?.id).toBe(video.id)
  })

  it('ignores a tabId parameter on a page outside the extension', async () => {
    const { video, popupPage } = await openTabs()
    vi.stubGlobal(
      'location',
      new URL(`https://video.example/watch?tabId=${video.id}`)
    )

    expect((await resolveTargetTab())?.id).toBe(popupPage.id)
  })

  it('sends tab RPCs from a detached popup page to the originating tab', async () => {
    const { video } = await openTabs()
    stubPopupLocation(`?detached=1&tabId=${video.id}`)
    const sendMessage = vi
      .spyOn(fakeBrowser.tabs, 'sendMessage')
      .mockResolvedValue(undefined)

    await tabSender({ method: 'ping', input: undefined })

    expect(sendMessage).toHaveBeenCalledWith(video.id, {
      method: 'ping',
      input: undefined,
    })
  })
})
