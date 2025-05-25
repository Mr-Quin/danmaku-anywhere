import {
  type VideoScraperPolicy,
  examplePolicy,
} from '@/common/options/videoScraperPolicy/schema'
import type { ChapterResult, SearchResult } from '@/common/scraper/videoScraper'
import {
  extractVideoUrl,
  getChapters,
  searchContent,
} from '@/common/scraper/videoScraper'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { DPlayerComponent } from '@/popup/pages/player/DPlayerComponent'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [directUrl, setDirectUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Video scraper policy state
  const [policies, setPolicies] = useState<VideoScraperPolicy[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [chapters, setChapters] = useState<ChapterResult[]>([])
  const [selectedContent, setSelectedContent] = useState<SearchResult | null>(
    null
  )
  const [selectedChapter, setSelectedChapter] = useState<ChapterResult | null>(
    null
  )

  // Load policies on component mount
  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const allPolicies = [examplePolicy]
        setPolicies(allPolicies)
      } catch (err) {
        console.error('Failed to load policies:', err)
        setError('Failed to load policies')
      }
    }

    loadPolicies()
  }, [])

  // Get the selected policy
  const selectedPolicy = policies[0]

  // Handle direct URL input
  const handleDirectUrlPlay = () => {
    if (directUrl) {
      setVideoUrl(directUrl)
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!selectedPolicy || !searchKeyword) return

    setLoading(true)
    setError(null)
    setSearchResults([])
    setChapters([])
    setSelectedContent(null)
    setSelectedChapter(null)
    setVideoUrl(undefined)

    try {
      const results = await searchContent(selectedPolicy, searchKeyword)
      setSearchResults(results)
    } catch (err) {
      console.error('Search failed:', err)
      setError(
        'Search failed: ' + (err instanceof Error ? err.message : String(err))
      )
    } finally {
      setLoading(false)
    }
  }

  const searchContentQuery = useQuery({
    queryKey: ['searchContent'],
    queryFn: () => searchContent(selectedPolicy, searchKeyword),
    enabled: false,
  })

  const getChaptersQuery = useQuery({
    queryKey: ['searchContent'],
    queryFn: () => getChapters(selectedPolicy, content.url),
    enabled: false,
  })

  // Handle content selection
  const handleContentSelect = async (content: SearchResult) => {
    setSelectedContent(content)
    setChapters([])
    setSelectedChapter(null)
    setVideoUrl(undefined)
    setLoading(true)
    setError(null)

    try {
      const chapterResults = await getChapters(selectedPolicy!, content.url)
      setChapters(chapterResults)
    } catch (err) {
      console.error('Failed to get chapters:', err)
      setError(
        'Failed to get chapters: ' +
          (err instanceof Error ? err.message : String(err))
      )
    } finally {
      setLoading(false)
    }
  }

  // Handle chapter selection
  const handleChapterSelect = async (chapter: ChapterResult) => {
    setSelectedChapter(chapter)
    setVideoUrl(undefined)
    setLoading(true)
    setError(null)

    try {
      const url = await extractVideoUrl(selectedPolicy!, chapter.url)
      setVideoUrl(url)
    } catch (err) {
      console.error('Failed to extract video URL:', err)
      setError(
        'Failed to extract video URL: ' +
          (err instanceof Error ? err.message : String(err))
      )
    } finally {
      setLoading(false)
    }
  }

  // Legacy direct URL scraping
  const handleLegacyScrape = async () => {
    if (!directUrl) return

    setLoading(true)
    setError(null)

    try {
      const tab = await chrome.tabs.create({
        active: false,
        url: directUrl,
      })

      if (!tab.id) {
        throw new Error('Failed to create tab')
      }

      const tabId = tab.id
      const urlCandidates: UrlData[] = []

      const addUrl = (url: UrlData) => {
        urlCandidates.push(url)
      }

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

      let count = 0

      const getUrl = async () => {
        count += 1
        if (count > 30) {
          clearInterval(interval)
          chrome.tabs.remove(tabId)

          if (urlCandidates.length > 0) {
            setVideoUrl(urlCandidates[0].url)
          } else {
            setError('Could not find video URL')
          }

          setLoading(false)
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
          clearInterval(interval)
          chrome.tabs.remove(tabId)
          setVideoUrl(url.url)
          setLoading(false)
        }
      }

      const interval = setInterval(getUrl, 1000)
    } catch (err) {
      console.error('Legacy scrape failed:', err)
      setError(
        'Legacy scrape failed: ' +
          (err instanceof Error ? err.message : String(err))
      )
      setLoading(false)
    }
  }

  return (
    <TabLayout>
      <TabToolbar title={t('tabs.player')} />

      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Video Player
        </Typography>

        {/* Direct URL Input */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Direct URL
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                label="Video URL"
                variant="outlined"
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleDirectUrlPlay}
                disabled={!directUrl}
              >
                Play
              </Button>
              <Button
                variant="outlined"
                onClick={handleLegacyScrape}
                disabled={!directUrl}
              >
                Scrape
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Video Scraper */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Video Scraper
            </Typography>

            {/* Policy Selection */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Policy</InputLabel>
              <Select label="Select Policy">
                {policies.map((policy) => (
                  <MenuItem key={policy.name} value={policy.name}>
                    {policy.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                label="Search Keyword"
                variant="outlined"
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={!selectedPolicy || !searchKeyword || loading}
              >
                Search
              </Button>
            </Box>

            {/* Loading and Error */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {error && (
              <Typography color="error" sx={{ my: 2 }}>
                {error}
              </Typography>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Search Results
                </Typography>
                <List dense>
                  {searchResults.map((result, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        onClick={() => handleContentSelect(result)}
                        selected={selectedContent?.url === result.url}
                      >
                        <ListItemText primary={result.name} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Chapters */}
            {chapters.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Chapters
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {chapters.map((chapter, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        onClick={() => handleChapterSelect(chapter)}
                        selected={selectedChapter?.url === chapter.url}
                      >
                        <ListItemText primary={chapter.name} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Video Player */}
      {videoUrl && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {selectedChapter ? selectedChapter.name : 'Video Player'}
          </Typography>
          <DPlayerComponent videoUrl={videoUrl} autoplay />
        </Box>
      )}
    </TabLayout>
  )
}
