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
          setError('请求过于频繁，请稍后重试')
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
