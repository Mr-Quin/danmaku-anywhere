import { useEffect, useState } from 'react'
import '../daisy.css'

interface Asset {
  name: string
  browser_download_url: string
  size: number
}

interface Release {
  id: number
  name: string
  tag_name: string
  published_at: string
  html_url: string
  assets: Asset[]
  prerelease: boolean
  body: string
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return '刚刚'
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} 分钟前`
  }
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} 小时前`
  }
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} 天前`
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getTagType = (name: string, tag: string) => {
  const lowerName = (name + tag).toLowerCase()
  if (lowerName.includes('nightly'))
    return { label: 'Nightly', color: 'badge-secondary' }
  if (lowerName.includes('pr')) return { label: 'PR', color: 'badge-accent' }
  return { label: 'Pre', color: 'badge-ghost' }
}

const DownloadButtons = ({
  assets,
  compact = false,
  type,
}: {
  assets: Asset[]
  compact?: boolean
  type?: 'chromium' | 'firefox' | 'android'
}) => {
  const chromeZip = assets.find((a) => a.name.includes('chrome.zip'))
  const chromeCrx = assets.find((a) => a.name.endsWith('.crx'))
  const firefoxZip = assets.find((a) => a.name.includes('firefox.zip'))

  // For table view, only show specific type
  if (type) {
    if (type === 'chromium' && chromeZip) {
      return (
        <a
          href={chromeZip.browser_download_url}
          className="btn btn-xs btn-outline btn-primary"
          title="下载 Chrome/Edge 压缩包"
        >
          ZIP
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
          ZIP
        </a>
      )
    }
    if (type === 'android' && chromeCrx) {
      // Changed from neutral to accent/info for better visibility
      return (
        <a
          href={chromeCrx.browser_download_url}
          className="btn btn-xs btn-outline btn-info"
          title="下载 Android CRX"
        >
          CRX
        </a>
      )
    }
    return <span className="text-xs opacity-20">-</span>
  }

  // Check if we are in compact mode but not specific type (fallback)
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {chromeZip && (
          <a
            href={chromeZip.browser_download_url}
            className="btn btn-xs btn-outline btn-primary"
          >
            Chrome ZIP
          </a>
        )}
        {firefoxZip && (
          <a
            href={firefoxZip.browser_download_url}
            className="btn btn-xs btn-outline btn-secondary"
          >
            Firefox ZIP
          </a>
        )}
        {chromeCrx && (
          <a
            href={chromeCrx.browser_download_url}
            className="btn btn-xs btn-outline btn-info"
          >
            Android CRX
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-2">
      {chromeZip && (
        <a
          href={chromeZip.browser_download_url}
          className="btn btn-primary join-item"
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
        // Changed color to btn-info to be visible in dark mode
        <a
          href={chromeCrx.browser_download_url}
          className="btn btn-info join-item text-white"
        >
          <span className="flex flex-col items-center">
            <span>Android (Kiwi 等)</span>
            <span className="text-xs opacity-70 font-normal">
              移动端 (.crx)
            </span>
          </span>
        </a>
      )}
      {firefoxZip && (
        <a
          href={firefoxZip.browser_download_url}
          className="btn btn-secondary join-item"
        >
          <span className="flex flex-col items-center">
            <span>Firefox</span>
            <span className="text-xs opacity-70 font-normal">
              桌面端 (.zip)
            </span>
          </span>
        </a>
      )}
    </div>
  )
}

const LatestReleaseHero = ({ release }: { release: Release }) => {
  return (
    <div className="card bg-base-100 shadow-xl border border-primary/20">
      <div className="card-body p-6">
        <h3 className="card-title text-2xl mb-2">
          最新版本: {release.name || release.tag_name}
          <div className="badge badge-primary badge-outline ml-2">最新</div>
        </h3>
        <div className="text-sm opacity-70 mb-4">
          发布于 {formatRelativeTime(release.published_at)}
          {' · '}
          <a
            href={release.html_url}
            target="_blank"
            className="link link-hover"
            rel="noopener"
          >
            更新日志
          </a>
        </div>

        <div className="divider my-0" />

        <div className="py-2">
          <div className="text-sm font-bold mb-2 uppercase tracking-wide opacity-50">
            下载选项
          </div>
          <DownloadButtons assets={release.assets} />
        </div>
      </div>
    </div>
  )
}

const HistoryTable = ({ releases }: { releases: Release[] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th>版本</th>
            <th>发布时间</th>
            <th>Chrome</th>
            <th>Firefox</th>
            <th>Android</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => {
            const tagInfo = getTagType(release.name || '', release.tag_name)
            return (
              <tr key={release.id} className="hover">
                <td className="font-bold">
                  <div className="flex items-center gap-2">
                    <a
                      href={release.html_url}
                      target="_blank"
                      className="hover:underline"
                      rel="noopener"
                    >
                      {release.name || release.tag_name}
                    </a>
                    {release.prerelease && (
                      <span className={`badge badge-xs ${tagInfo.color}`}>
                        {tagInfo.label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-sm opacity-70 whitespace-nowrap">
                  {formatRelativeTime(release.published_at)}
                </td>
                <td>
                  <DownloadButtons assets={release.assets} type="chromium" />
                </td>
                <td>
                  <DownloadButtons assets={release.assets} type="firefox" />
                </td>
                <td>
                  <DownloadButtons assets={release.assets} type="android" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const ReleaseSection = ({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 mt-8 pb-2 border-b border-base-300">
        {title}
      </h2>
      {children}
    </div>
  )
}

export const LatestBuilds = () => {
  const [latestRelease, setLatestRelease] = useState<Release | null>(null)
  const [preReleases, setPreReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const [latestRes, listRes] = await Promise.all([
          fetch(
            'https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases/latest'
          ),
          fetch(
            'https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases?per_page=15'
          ),
        ])

        if (latestRes.status === 403 || listRes.status === 403) {
          setError('请求过于频繁，请稍后重试')
          return
        }

        // Handle latest release
        let latestData: Release | null = null
        if (latestRes.ok) {
          latestData = await latestRes.json()
          setLatestRelease(latestData)
        }

        // Handle list releases
        if (listRes.ok) {
          const listData: Release[] = await listRes.json()
          // Filter previews
          const pres = listData.filter((r) => r.prerelease)
          setPreReleases(pres)
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchReleases()
  }, [])

  if (loading)
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full" />
      </div>
    )

  if (error) {
    return (
      <div className="alert alert-error">
        <span>获取版本信息失败: {error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 not-content">
      {latestRelease && <LatestReleaseHero release={latestRelease} />}

      {!latestRelease && !loading && !error && (
        <div className="alert alert-warning">
          <span>未能找到最新的正式版本，请查看下方的预览构建。</span>
        </div>
      )}

      {preReleases.length > 0 && (
        <ReleaseSection title={`历史版本 / 预览版 (${preReleases.length})`}>
          <div className="alert mb-4 text-sm shadow-sm">
            <span>预览版包含最新的功能更改，可能存在不稳定的情况。</span>
          </div>
          <HistoryTable releases={preReleases} />
        </ReleaseSection>
      )}
    </div>
  )
}
