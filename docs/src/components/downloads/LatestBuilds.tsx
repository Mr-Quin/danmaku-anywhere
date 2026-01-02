import { DownloadButtons } from './DownloadButtons.tsx'
import type { Release } from './types.ts'
import { useReleases } from './useReleases.ts'

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

type BuildInfo =
  | {
      label: 'Nightly'
      color: string
      buildNumber?: string
    }
  | {
      label: 'PR'
      color: string
      buildNumber?: string
      prNumber: string
    }
  | {
      label: 'Pre'
      color: string
      buildNumber?: string
    }

const getBuildInfo = (name: string, tag: string): BuildInfo => {
  const buildNumber = /\((\d+)\)/.exec(name)?.[1]

  if (tag.includes('nightly')) {
    return {
      label: 'Nightly',
      color: 'daisy-badge-secondary',
      buildNumber,
    }
  }

  if (tag.includes('pr')) {
    const prNumber = /(\d+)/.exec(tag)?.[1]
    return {
      label: 'PR',
      color: 'daisy-badge-accent',
      buildNumber,
      prNumber: prNumber ?? '',
    }
  }

  return {
    label: 'Pre',
    color: 'daisy-badge-ghost',
    buildNumber,
  }
}

const LatestReleaseHero = ({ release }: { release: Release }) => {
  return (
    <div className="daisy-card bg-base-100 shadow-xl border border-primary/20">
      <div className="daisy-card-body p-6">
        <h3 className="daisy-card-title text-2xl mb-2">
          最新版本: {release.name || release.tag_name}
          <div className="daisy-badge daisy-badge-primary daisy-badge-outline ml-2">
            最新
          </div>
        </h3>
        <div className="text-sm opacity-70">
          发布于 {formatRelativeTime(release.published_at)}
          {' · '}
          <a
            href={release.html_url}
            target="_blank"
            className="daisy-link daisy-link-hover"
            rel="noopener"
          >
            更新日志
          </a>
        </div>

        <div className="daisy-divider my-0" />

        <DownloadButtons assets={release.assets} />
      </div>
    </div>
  )
}

const ReleaseBadge = ({ buildInfo }: { buildInfo: BuildInfo }) => {
  if (buildInfo.label === 'PR') {
    return (
      <a
        href={`https://github.com/Mr-Quin/danmaku-anywhere/pull/${buildInfo.prNumber}`}
        target="_blank"
        rel="noopener"
        className={`daisy-badge daisy-badge-xs ${buildInfo.color}`}
      >
        PR {buildInfo.prNumber}
      </a>
    )
  }
  return (
    <span className={`daisy-badge daisy-badge-xs ${buildInfo.color}`}>
      {buildInfo.label}
    </span>
  )
}

const HistoryTable = ({ releases }: { releases: Release[] }) => {
  return (
    <div className="overflow-x-auto bg-base-100 border border-primary/20 rounded-lg">
      <table className="daisy-table w-full">
        <thead>
          <tr>
            <th>版本</th>
            <th>发布时间</th>
            <th>下载</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => {
            const buildInfo = getBuildInfo(release.name || '', release.tag_name)
            return (
              <tr key={release.id} className="daisy-hover">
                <td className="font-bold">
                  <div className="flex items-center gap-2">
                    <a
                      href={release.html_url}
                      target="_blank"
                      className="hover:underline"
                      rel="noopener"
                    >
                      {buildInfo.buildNumber || release.tag_name}
                    </a>
                    {release.prerelease && (
                      <ReleaseBadge buildInfo={buildInfo} />
                    )}
                  </div>
                </td>
                <td className="text-sm opacity-70 whitespace-nowrap">
                  {formatRelativeTime(release.published_at)}
                </td>
                <td className="flex flex-col lg:flex-row gap-2">
                  <DownloadButtons assets={release.assets} type="chromium" />
                  <DownloadButtons assets={release.assets} type="firefox" />
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
  const { latestRelease, preReleases, loading, error } = useReleases()

  if (loading)
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="daisy-skeleton h-32 w-full" />
        <div className="daisy-skeleton h-4 w-28" />
        <div className="daisy-skeleton h-4 w-full" />
        <div className="daisy-skeleton h-4 w-full" />
      </div>
    )

  if (error) {
    return (
      <div className="daisy-alert daisy-alert-error">
        <span>获取版本信息失败: {error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 not-content">
      {latestRelease && <LatestReleaseHero release={latestRelease} />}

      {!latestRelease && !loading && !error && (
        <div className="daisy-alert daisy-alert-warning">
          <span>未能找到最新的正式版本，请查看下方的预览构建。</span>
        </div>
      )}

      {preReleases.length > 0 && (
        <ReleaseSection title={`预览版 (${preReleases.length})`}>
          <div
            role="alert"
            className="daisy-alert daisy-alert-soft mb-4 text-sm shadow-sm"
          >
            <span>预览版包含最新的功能更改，可能存在不稳定的情况。</span>
          </div>
          <HistoryTable releases={preReleases} />
        </ReleaseSection>
      )}
    </div>
  )
}
