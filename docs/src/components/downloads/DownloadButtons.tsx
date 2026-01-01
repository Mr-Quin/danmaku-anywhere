import type { Asset } from './types.ts'

export const DownloadButtons = ({
  assets,
  type,
}: {
  assets: Asset[]
  type?: 'chromium' | 'firefox' | 'android'
}) => {
  const chromeZip = assets.find((a) => a.name.includes('chrome.zip'))
  const chromeCrx = assets.find((a) => a.name.endsWith('.crx'))
  const firefoxZip = assets.find((a) => a.name.includes('firefox.zip'))

  if (type) {
    if (type === 'chromium' && chromeZip) {
      return (
        <a
          href={chromeZip.browser_download_url}
          className="btn btn-xs btn-outline btn-primary"
          title="下载 Chrome/Edge 压缩包"
        >
          Chrome (.zip)
        </a>
      )
    }
    if (type === 'firefox' && firefoxZip) {
      return (
        <a
          href={firefoxZip.browser_download_url}
          className="btn btn-xs btn-outline btn-secondary"
          title="下载 Firefox 压缩包"
        >
          Firefox (.zip)
        </a>
      )
    }
    if (type === 'android' && chromeCrx) {
      return (
        <a
          href={chromeCrx.browser_download_url}
          className="btn btn-xs btn-outline btn-info"
          title="下载 Android CRX"
        >
          Edge Canary (.crx)
        </a>
      )
    }
    return <span className="text-xs opacity-20">-</span>
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-2">
      {chromeZip && (
        <a
          href={chromeZip.browser_download_url}
          className="btn btn-primary join-item py-1 px-4 h-auto"
        >
          <span className="flex flex-col items-center">
            <span>Chrome / Edge</span>
            <span className="text-xs opacity-70 font-normal">
              桌面端 (.zip)
            </span>
          </span>
        </a>
      )}
      {chromeCrx && (
        <a
          href={chromeCrx.browser_download_url}
          className="btn btn-info join-item text-white py-1 px-4 h-auto"
        >
          <span className="flex flex-col items-center">
            <span>Edge Canary (安卓)</span>
            <span className="text-xs opacity-70 font-normal">安卓 (.crx)</span>
          </span>
        </a>
      )}
      {firefoxZip && (
        <a
          href={firefoxZip.browser_download_url}
          className="btn btn-secondary join-item py-1 px-4 h-auto"
        >
          <span className="flex flex-col items-center">
            <span>Firefox</span>
            <span className="text-xs opacity-70 font-normal">
              桌面/安卓 (.zip)
            </span>
          </span>
        </a>
      )}
    </div>
  )
}
