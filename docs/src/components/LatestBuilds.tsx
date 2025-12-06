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

const ReleaseCard = ({ release }: { release: Release }) => {
  const assets = release.assets
  const chromeZip = assets.find((a) => a.name.includes('chrome.zip'))
  const chromeCrx = assets.find((a) => a.name.endsWith('.crx'))
  const firefoxZip = assets.find((a) => a.name.includes('firefox.zip'))

  const date = new Date(release.published_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const daysAgo = Math.floor(
    (new Date().getTime() - new Date(release.published_at).getTime()) /
      1000 /
      60 /
      60 /
      24
  )

  return (
    <div className={'card'}>
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="card-title text-base">
              <a
                href={release.html_url}
                target="_blank"
                className="hover:underline color-inherit"
                rel="noopener"
              >
                {release.name || release.tag_name}
              </a>
            </h3>
            <div className="text-xs opacity-70 mt-1">
              {date} ({daysAgo} 天前)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {chromeZip && (
            <a
              href={chromeZip.browser_download_url}
              className="btn btn-sm btn-primary"
            >
              {chromeZip.name}
            </a>
          )}
          {chromeCrx && (
            <a
              href={chromeCrx.browser_download_url}
              className="btn btn-sm btn-primary"
            >
              {chromeCrx.name}
            </a>
          )}
          {firefoxZip && (
            <a
              href={firefoxZip.browser_download_url}
              className="btn btn-sm btn-primary"
            >
              {firefoxZip.name}
            </a>
          )}
        </div>
      </div>
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
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      {children}
    </div>
  )
}

export const LatestBuilds = () => {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const res = await fetch(
          'https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases?per_page=10'
        )
        if (res.status === 403) {
          setError('请求过于频繁，请稍后重试')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to fetch releases')
        }
        const data = await res.json()
        setReleases(data)
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
      <div>
        <div className="text-error">获取版本信息失败: {error}</div>
        <div>
          请尝试刷新页面或前往{' '}
          <a href="https://github.com/Mr-Quin/danmaku-anywhere/releases">
            GitHub 发布页面
          </a>{' '}
          查看
        </div>
      </div>
    )
  }

  const latestRelease = releases.find((r) => !r.prerelease)
  const preReleases = releases.filter((r) => r.prerelease)

  return (
    <div className="space-y-6 not-content">
      {latestRelease && (
        <ReleaseSection title="最新版本">
          <ReleaseCard release={latestRelease} />
        </ReleaseSection>
      )}

      {preReleases.length > 0 && (
        <ReleaseSection title={`预览版本 (${preReleases.length})`}>
          <div className="space-y-4 pt-2">
            {preReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </ReleaseSection>
      )}
    </div>
  )
}
