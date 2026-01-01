import { useEffect, useState } from 'react'
import type { Release } from './types.ts'

export function useReleases() {
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
          const rateLimitRemainingHeader =
            latestRes.headers.get('X-RateLimit-Remaining') ??
            listRes.headers.get('X-RateLimit-Remaining')
          const isRateLimited = rateLimitRemainingHeader === '0'
          const baseMessage = isRateLimited
            ? 'GitHub API 访问频率受限，请稍后重试。'
            : '访问 GitHub 发布信息时被拒绝（HTTP 403）。'
          const moreInfo =
            ' 你可以稍后重试，或直接访问发布页面： https://github.com/Mr-Quin/danmaku-anywhere/releases'
          setError(baseMessage + moreInfo)
          return
        }

        let latestData: Release | null = null
        if (latestRes.ok) {
          latestData = await latestRes.json()
          setLatestRelease(latestData)
        }

        if (listRes.ok) {
          const listData: Release[] = await listRes.json()
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

  return {
    latestRelease,
    preReleases,
    loading,
    error,
  }
}
