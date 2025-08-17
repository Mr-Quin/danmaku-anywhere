import type { CustomSeason } from '@danmaku-anywhere/danmaku-converter'
import type { VodItem } from '@danmaku-anywhere/danmaku-provider/generic'
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SeasonGrid } from '@/common/components/MediaList/components/SeasonGrid'
import { SearchForm } from '@/common/components/SearchForm'
import { useToast } from '@/common/components/Toast/toastStore'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const SearchCustomTab = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [baseUrl, setBaseUrl] = useState('https://www.69mu.cn')
  const [keyword, setKeyword] = useState('')
  const [useSimplified, setUseSimplified] = useState(false)
  const [results, setResults] = useState<CustomSeason[]>([])
  const [rawList, setRawList] = useState<VodItem[]>([])
  const [playList, setPlayList] = useState<{
    title: string
    vod: VodItem
    items: { source: string; url: string; episodeNumber: number }[]
  } | null>(null)

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.customSearchVod({ baseUrl, keyword })
      return res.data
    },
    onSuccess: (data) => {
      setResults(data.seasons)
      setRawList(data.list)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed')
    },
  })

  const parsePlayMutation = useMutation({
    mutationFn: async (vod: VodItem) => {
      const res = await chromeRpcClient.customParsePlayUrls(vod)
      return res.data
    },
    onSuccess: (data) => {
      if (!playList) return
      setPlayList({ ...playList, items: data })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  })

  const fetchDanmakuMutation = useMutation({
    mutationFn: async ({ title, url }: { title: string; url: string }) => {
      const res = await chromeRpcClient.customFetchDanmakuForUrl({ title, url })
      return res.data
    },
    onSuccess: () => {
      toast.success(t('common.success'))
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  })

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Box display="flex" gap={1}>
        <input
          style={{ flex: 1 }}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Base URL (e.g. https://v.halacg1.com)"
        />
      </Box>
      <SearchForm
        isLoading={searchMutation.isPending}
        onSearch={() => searchMutation.mutate()}
        useSimplified={useSimplified}
        onSimplifiedChange={(on, text) => {
          setUseSimplified(on)
          setKeyword(text)
        }}
        searchTerm={keyword}
        onSearchTermChange={setKeyword}
      />
      {results.length > 0 && (
        <SeasonGrid
          data={results}
          onSeasonClick={async (season) => {
            const index = results.findIndex((s) => s.id === season.id)
            const vod = rawList[index]
            setPlayList({ title: season.title, vod, items: [] })
            parsePlayMutation.mutate(vod)
          }}
        />
      )}
      {playList && (
        <Box>
          <Typography variant="subtitle1">
            {t('searchPage.episodes', { defaultValue: 'Episodes' })}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <List dense>
            {playList.items.map((item) => (
              <ListItem
                key={`${item.source}-${item.episodeNumber}`}
                disablePadding
              >
                <ListItemText
                  primary={`${item.source} - ${item.episodeNumber}`}
                  secondary={item.url}
                  onClick={() =>
                    fetchDanmakuMutation.mutate({
                      title: `${playList.title}#${item.episodeNumber}`,
                      url: item.url,
                    })
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}
