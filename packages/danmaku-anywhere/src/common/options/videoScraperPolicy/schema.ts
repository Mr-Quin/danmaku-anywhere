import { z } from 'zod'
import { getRandomUUID } from '@/common/utils/utils'

// Define the schema for video scraper policies
export const zVideoScraperPolicy = z.object({
  api: z.string(),
  type: z.string(),
  name: z.string().min(1),
  version: z.string(),
  muliSources: z.boolean().optional().default(false),
  useWebview: z.boolean().optional().default(false),
  useNativePlayer: z.boolean().optional().default(false),
  usePost: z.boolean().optional().default(false),
  useLegacyParser: z.boolean().optional().default(false),
  userAgent: z.string().optional().default(''),
  baseURL: z.string().min(1),
  searchURL: z.string().min(1),
  searchList: z.string().min(1),
  searchName: z.string().min(1),
  searchResult: z.string().min(1),
  chapterRoads: z.string().min(1),
  chapterResult: z.string().min(1),
  referer: z.string().optional().default(''),
})

export type VideoScraperPolicy = z.infer<typeof zVideoScraperPolicy>

export const zVideoScraper = z.object({
  id: z.string().uuid().optional().default(getRandomUUID()),
  policy: zVideoScraperPolicy,
})

export type VideoScraper = z.infer<typeof zVideoScraper>

// Create a default video scraper policy
export const createDefaultVideoScraperPolicy = (): VideoScraperPolicy => {
  return {
    api: '3',
    type: 'anime',
    name: '',
    version: '1.0',
    muliSources: false,
    useWebview: true,
    useNativePlayer: true,
    usePost: false,
    useLegacyParser: true,
    userAgent: '',
    baseURL: '',
    searchURL: '',
    searchList: '',
    searchName: '',
    searchResult: '',
    chapterRoads: '',
    chapterResult: '',
    referer: '',
  }
}

// Create a default video scraper
export const createDefaultVideoScraper = (): VideoScraper => {
  return {
    id: getRandomUUID(),
    policy: createDefaultVideoScraperPolicy(),
  }
}

// Example policy from the issue description
export const examplePolicy: VideoScraperPolicy = {
  api: '3',
  type: 'anime',
  name: 'xfdm',
  version: '1.5',
  muliSources: true,
  useWebview: true,
  useNativePlayer: true,
  usePost: false,
  useLegacyParser: true,
  userAgent: '',
  baseURL: 'https://dm1.xfdm.pro/',
  searchURL: 'https://dm1.xfdm.pro/search.html?wd=@keyword',
  searchList: '//div[contains(@class, \'search-box\')]',
  searchName: '//div[3]/div[1]/div[1]',
  searchResult: '//div[3]/div[2]/a[1]',
  chapterRoads: '//ul[contains(@class, \'anthology-list-play\')]',
  chapterResult: '//li/a',
  referer: '',
}