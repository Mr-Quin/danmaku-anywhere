import {
  type CustomEpisodeLite,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import type { MediaInfo } from '@danmaku-anywhere/web-scraper'
import { FAKE_MEDIA_DATA_URI } from './fake-media-data'

interface FakeShow {
  id: number
  title: string
  short: string
  eps: number
}

export const FAKE_SHOWS: FakeShow[] = [
  { id: 1455, title: '葬送的芙莉莲', short: '芙莉莲', eps: 28 },
  { id: 3502, title: '迷宫饭', short: '迷宫饭', eps: 24 },
  { id: 2658, title: '青之箱', short: '青之箱', eps: 24 },
  { id: 2199, title: '间谍过家家 S3', short: '间谍过家家', eps: 12 },
  { id: 2911, title: '夜晚的水母不会游泳', short: '夜水母', eps: 12 },
  { id: 1882, title: '怪兽八号', short: '怪兽八号', eps: 12 },
  {
    id: 1014,
    title: 'Re：从零开始的异世界生活 S3',
    short: 'Re:从零 S3',
    eps: 25,
  },
  { id: 3401, title: '香格里拉·开拓异境', short: '香格里拉', eps: 25 },
  { id: 2703, title: '败北女角太多了！', short: '败北女角', eps: 12 },
  {
    id: 802,
    title: '上伊那牡丹，酒醉身姿似百合花般',
    short: '上伊那牡丹',
    eps: 12,
  },
  { id: 3285, title: '杖与剑的魔剑谭', short: '杖与剑', eps: 12 },
  {
    id: 2057,
    title: '女神"异世界转生想成为何物"',
    short: '女神异世界转生',
    eps: 13,
  },
]

export const fakeSearchResults: { name: string; url: string }[] = [
  { name: FAKE_SHOWS[0].title, url: `https://fake.kazumi/${FAKE_SHOWS[0].id}` },
  { name: FAKE_SHOWS[1].title, url: `https://fake.kazumi/${FAKE_SHOWS[1].id}` },
  { name: FAKE_SHOWS[2].title, url: `https://fake.kazumi/${FAKE_SHOWS[2].id}` },
]

function makePlaylist(showId: number, count: number) {
  const chapters: { name: string; url: string }[] = []
  for (let i = 1; i <= count; i += 1) {
    chapters.push({
      name: `第${i}话`,
      url: `https://fake.kazumi/${showId}/play/${i}`,
    })
  }
  return chapters
}

export const fakeChapters: { name: string; url: string }[][] = [
  makePlaylist(FAKE_SHOWS[0].id, 12),
  makePlaylist(FAKE_SHOWS[0].id, 12),
]

export const fakeMedia: MediaInfo = {
  src: FAKE_MEDIA_DATA_URI,
  contentType: 'video/mp4',
  type: 'video',
}

function makeCustomEpisode(show: FakeShow, index: number): CustomEpisodeLite {
  return {
    id: index + 1,
    version: 1,
    timeUpdated: 0,
    provider: DanmakuSourceType.MacCMS,
    title: show.title,
    commentCount: 100 + index,
    schemaVersion: 4,
  }
}

export const fakeEpisodes: CustomEpisodeLite[] = FAKE_SHOWS.map((show, index) =>
  makeCustomEpisode(show, index)
)
