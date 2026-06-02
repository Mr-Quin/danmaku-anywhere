import type { components as LegacyComponents } from '@danmaku-anywhere/bangumi-api'
import type { components as NextComponents } from '@danmaku-anywhere/bangumi-api/next'
import type {
  BgmCalendar,
  BgmGetSubjectCommentResponse,
  BgmGetSubjectReviewResponse,
  BgmGetTopicResponse,
  BgmSubject,
  BgmTrendingQueryResponse,
  LegacyBgmSubjectResponse,
} from '../../../features/bangumi/types/bangumi.types'

// Fake covers/avatars resolve to a tiny same-origin SVG served by the fake
// build so NgOptimizedImage (which rejects data:/blob: srcs) stays happy and
// the e2e network watcher sees only localhost requests, never api.bgm.tv.
const FAKE_IMAGE = '/fake-cover.svg'

type SlimSubject = NextComponents['schemas']['SlimSubject']
type SubjectImages = NextComponents['schemas']['SubjectImages']
type SubjectRating = NextComponents['schemas']['SubjectRating']
type Episode = NextComponents['schemas']['Episode']
type SubjectCharacter = NextComponents['schemas']['SubjectCharacter']
type SubjectRelation = NextComponents['schemas']['SubjectRelation']
type SubjectStaff = NextComponents['schemas']['SubjectStaff']
type SubjectRec = NextComponents['schemas']['SubjectRec']
type SlimUser = NextComponents['schemas']['SlimUser']
type LegacyImages = LegacyComponents['schemas']['Images']

interface FakeShow {
  id: number
  title: string
  ja: string
  short: string
  rating: number
  year: number
  eps: number
  tags: string[]
  synopsis: string
}

export const FAKE_BGM_SHOWS: FakeShow[] = [
  {
    id: 1455,
    title: '葬送的芙莉莲',
    ja: '葬送のフリーレン',
    short: '芙莉莲',
    rating: 9.1,
    year: 2026,
    eps: 28,
    tags: ['奇幻', '治愈', '冒险'],
    synopsis:
      '勇者一行打倒魔王后，活了千年的精灵魔法使芙莉莲，踏上了一段重新理解人类的旅程。',
  },
  {
    id: 3502,
    title: '迷宫饭',
    ja: 'ダンジョン飯',
    short: '迷宫饭',
    rating: 8.5,
    year: 2026,
    eps: 24,
    tags: ['奇幻', '美食', '冒险'],
    synopsis:
      '为了拯救被龙吞食的妹妹，莱欧斯一行决定一边攻略迷宫，一边把魔物做成料理。',
  },
  {
    id: 2658,
    title: '青之箱',
    ja: 'アオのハコ',
    short: '青之箱',
    rating: 8.2,
    year: 2026,
    eps: 24,
    tags: ['青春', '恋爱', '运动'],
    synopsis: '羽毛球少年与篮球少女，在同一个屋檐下的清晨与黄昏。',
  },
  {
    id: 2199,
    title: '间谍过家家 S3',
    ja: 'SPY×FAMILY Season 3',
    short: '间谍过家家',
    rating: 8.3,
    year: 2026,
    eps: 12,
    tags: ['搞笑', '动作', '日常'],
    synopsis:
      '间谍、杀手与超能力少女组成的伪装家庭，又一次为了世界和平而手忙脚乱。',
  },
  {
    id: 2911,
    title: '夜晚的水母不会游泳',
    ja: '夜のクラゲは泳げない',
    short: '夜水母',
    rating: 8.0,
    year: 2026,
    eps: 12,
    tags: ['音乐', '青春', '原创'],
    synopsis: '匿名艺术团体 JELEE 在霓虹与夜色里诞生。',
  },
  {
    id: 1882,
    title: '怪兽八号',
    ja: '怪獣8号',
    short: '怪兽八号',
    rating: 7.7,
    year: 2026,
    eps: 12,
    tags: ['热血', '战斗', '科幻'],
    synopsis:
      '清扫怪兽尸体的清洁工，某天竟变成了被讨伐的对象，编号八号的怪兽。',
  },
  {
    id: 1014,
    title: 'Re：从零开始的异世界生活 S3',
    ja: 'Re:ゼロから始める異世界生活 3rd',
    short: 'Re:从零 S3',
    rating: 7.5,
    year: 2026,
    eps: 25,
    tags: ['奇幻', '悬疑', '致郁'],
    synopsis: '水门都市普利斯特拉的余波未平，昴再一次被抛入死亡回归的漩涡。',
  },
  {
    id: 3401,
    title: '香格里拉·开拓异境',
    ja: 'シャングリラ・フロンティア',
    short: '香格里拉',
    rating: 7.3,
    year: 2026,
    eps: 25,
    tags: ['游戏', '冒险', '奇幻'],
    synopsis: '专攻粪作游戏的玩家，挑战起了万人称颂的神作。',
  },
  {
    id: 2703,
    title: '败北女角太多了！',
    ja: '負けヒロインが多すぎる！',
    short: '败北女角',
    rating: 7.9,
    year: 2026,
    eps: 12,
    tags: ['校园', '恋爱', '搞笑'],
    synopsis: '文学部里聚集了一群败北的女主角们。',
  },
  {
    id: 802,
    title: '上伊那牡丹，酒醉身姿似百合花般',
    ja: '上伊那ぼたん、酔へる姿は百合の花のごと',
    short: '上伊那牡丹',
    rating: 7.6,
    year: 2026,
    eps: 12,
    tags: ['百合', '日常', '剧情'],
    synopsis: '不夜城的小酒馆牡丹里，每一杯酒都酿着一个故事。',
  },
  {
    id: 3285,
    title: '杖与剑的魔剑谭',
    ja: '杖と剣のウィストリア',
    short: '杖与剑',
    rating: 6.8,
    year: 2026,
    eps: 12,
    tags: ['奇幻', '热血', '校园'],
    synopsis: '无法使用魔法的少年，立誓要登上只有魔法师才能企及的高塔之巅。',
  },
  {
    id: 2057,
    title: '女神"异世界转生想成为何物"',
    ja: '女神「異世界転生何になりたい」',
    short: '女神异世界转生',
    rating: 7.1,
    year: 2026,
    eps: 13,
    tags: ['奇幻', '冒险', '搞笑'],
    synopsis: '当平凡的上班族被卷入一场神明的恶作剧，转生竟成了一道选择题。',
  },
]

function makeSubjectImages(_id: number): SubjectImages {
  return {
    common: FAKE_IMAGE,
    grid: FAKE_IMAGE,
    large: FAKE_IMAGE,
    medium: FAKE_IMAGE,
    small: FAKE_IMAGE,
  }
}

function makeRating(score: number): SubjectRating {
  return {
    count: [0, 0, 0, 0, 0, 0, 0, 100, 400, 500],
    rank: 1,
    score,
    total: 1000,
  }
}

function makeSlimSubject(show: FakeShow): SlimSubject {
  return {
    id: show.id,
    images: makeSubjectImages(show.id),
    info: `${show.year} / TV / ${show.eps}话`,
    locked: false,
    name: show.ja,
    nameCN: show.title,
    nsfw: false,
    rating: makeRating(show.rating),
    type: 2,
  }
}

function makeSlimUser(seed: number): SlimUser {
  return {
    avatar: {
      large: FAKE_IMAGE,
      medium: FAKE_IMAGE,
      small: FAKE_IMAGE,
    },
    group: 10,
    id: seed,
    joinedAt: 1_600_000_000,
    nickname: `观众${seed}`,
    sign: '',
    username: `user_${seed}`,
  }
}

export const fakeCalendar: BgmCalendar = Array.from({ length: 7 }, (_, day) => {
  const showsForDay = FAKE_BGM_SHOWS.filter((_, index) => index % 7 === day)
  return showsForDay.map((show) => {
    return {
      subject: makeSlimSubject(show),
      watchers: 1000 - show.id,
    }
  })
})

export function fakeTrendingPage(): BgmTrendingQueryResponse {
  const data = FAKE_BGM_SHOWS.map((show) => {
    return {
      count: 1000 - show.id,
      subject: makeSlimSubject(show),
    }
  })
  return {
    data,
    total: data.length,
  }
}

function findShow(subjectId: number): FakeShow {
  return (
    FAKE_BGM_SHOWS.find((show) => show.id === subjectId) ?? FAKE_BGM_SHOWS[0]
  )
}

export function fakeSubject(subjectId: number): BgmSubject {
  const show = findShow(subjectId)
  return {
    airtime: {
      date: `${show.year}-01-01`,
      month: 1,
      weekday: 1,
      year: show.year,
    },
    collection: { '1': 100, '2': 5000, '3': 200, '4': 80, '5': 40 },
    eps: show.eps,
    id: show.id,
    images: makeSubjectImages(show.id),
    info: `${show.year} / TV / ${show.eps}话`,
    infobox: [
      { key: '中文名', values: [{ v: show.title }] },
      { key: '别名', values: [{ v: show.ja }] },
      { key: '话数', values: [{ v: String(show.eps) }] },
    ],
    locked: false,
    metaTags: show.tags,
    name: show.ja,
    nameCN: show.title,
    nsfw: false,
    platform: {
      alias: 'tv',
      id: 1,
      type: 'TV',
      typeCN: 'TV',
    },
    rating: makeRating(show.rating),
    redirect: 0,
    series: false,
    seriesEntry: 0,
    summary: show.synopsis,
    tags: show.tags.map((name, index) => ({ count: 500 - index * 10, name })),
    type: 2,
    volumes: 0,
  }
}

export function fakeEpisodesPage(subjectId: number): {
  data: Episode[]
  total: number
} {
  const show = findShow(subjectId)
  const data: Episode[] = Array.from({ length: show.eps }, (_, index) => {
    const sort = index + 1
    return {
      airdate: `${show.year}-01-${String(sort).padStart(2, '0')}`,
      comment: 50 + index,
      desc: '',
      disc: 0,
      duration: '24:00',
      id: show.id * 1000 + sort,
      name: `Episode ${sort}`,
      nameCN: `第${sort}话`,
      sort,
      subjectID: show.id,
      type: 0,
    }
  })
  return { data, total: data.length }
}

export function fakeCharactersPage(subjectId: number): {
  data: SubjectCharacter[]
  total: number
} {
  const show = findShow(subjectId)
  const data: SubjectCharacter[] = Array.from({ length: 3 }, (_, index) => {
    const id = show.id * 100 + index
    return {
      actors: [
        {
          comment: 0,
          id: id + 9000,
          info: '声优',
          lock: false,
          name: `声优${index + 1}`,
          nameCN: `声优${index + 1}`,
          nsfw: false,
          type: 1,
        },
      ],
      character: {
        comment: 0,
        id,
        info: '',
        lock: false,
        name: `Character ${index + 1}`,
        nameCN: `角色${index + 1}`,
        nsfw: false,
        role: index === 0 ? 1 : 2,
      },
      order: index,
      type: index === 0 ? 1 : 2,
    }
  })
  return { data, total: data.length }
}

export function fakeRelationsPage(subjectId: number): {
  data: SubjectRelation[]
  total: number
} {
  const others = FAKE_BGM_SHOWS.filter((show) => show.id !== subjectId).slice(
    0,
    2
  )
  const data: SubjectRelation[] = others.map((show, index) => {
    return {
      order: index,
      relation: {
        cn: '续集',
        desc: '',
        en: 'Sequel',
        id: 1,
        jp: '続編',
      },
      subject: makeSlimSubject(show),
    }
  })
  return { data, total: data.length }
}

export function fakeStaffPersonsPage(subjectId: number): {
  data: SubjectStaff[]
  total: number
} {
  const show = findShow(subjectId)
  const data: SubjectStaff[] = Array.from({ length: 2 }, (_, index) => {
    return {
      positions: [
        {
          summary: '',
          type: {
            cn: index === 0 ? '导演' : '脚本',
            en: index === 0 ? 'Director' : 'Script',
            id: index + 1,
            jp: index === 0 ? '監督' : '脚本',
          },
        },
      ],
      staff: {
        comment: 0,
        id: show.id * 10 + index,
        info: '',
        lock: false,
        name: `Staff ${index + 1}`,
        nameCN: `制作人${index + 1}`,
        nsfw: false,
        type: 1,
      },
    }
  })
  return { data, total: data.length }
}

export function fakeRecsPage(subjectId: number): {
  data: SubjectRec[]
  total: number
} {
  const others = FAKE_BGM_SHOWS.filter((show) => show.id !== subjectId).slice(
    0,
    4
  )
  const data: SubjectRec[] = others.map((show, index) => {
    return {
      count: 100 - index,
      sim: 90 - index,
      subject: makeSlimSubject(show),
    }
  })
  return { data, total: data.length }
}

export function fakeReviewsPage(): BgmGetSubjectReviewResponse {
  const data = Array.from({ length: 2 }, (_, index) => {
    const id = 5000 + index
    return {
      entry: {
        createdAt: 1_700_000_000,
        icon: '',
        id,
        public: true,
        replies: index,
        summary: '这部作品的演出和作画都非常出色。',
        title: `评测 ${index + 1}`,
        type: 0,
        uid: index + 1,
        updatedAt: 1_700_000_000,
      },
      id,
      user: makeSlimUser(index + 1),
    }
  })
  return { data, total: data.length }
}

export function fakeTopicsPage(): BgmGetTopicResponse {
  const data = Array.from({ length: 2 }, (_, index) => {
    return {
      createdAt: 1_700_000_000,
      creator: makeSlimUser(index + 10),
      creatorID: index + 10,
      display: 1,
      id: 6000 + index,
      parentID: 0,
      replyCount: index * 3,
      state: 0,
      title: `讨论帖 ${index + 1}`,
      updatedAt: 1_700_000_500,
    }
  })
  return { data, total: data.length }
}

export function fakeCommentsPage(): BgmGetSubjectCommentResponse {
  const texts = [
    '二刷依然好哭，名作之壁。',
    '这一集 staff 是要素过多，泪目了家人们。',
  ]
  const data = texts.map((comment, index) => {
    return {
      comment,
      id: 7000 + index,
      rate: 9 - index,
      type: 2 as const,
      updatedAt: 1_700_000_000 + index,
      user: makeSlimUser(index + 20),
    }
  })
  return { data, total: data.length }
}

function makeLegacyImages(_id: number): LegacyImages {
  return {
    large: FAKE_IMAGE,
    common: FAKE_IMAGE,
    medium: FAKE_IMAGE,
    small: FAKE_IMAGE,
    grid: FAKE_IMAGE,
  }
}

export function fakeSearch(keyword: string): LegacyBgmSubjectResponse {
  const trimmed = keyword.trim()
  const matches = trimmed
    ? FAKE_BGM_SHOWS.filter((show) => {
        return show.title.includes(trimmed) || show.ja.includes(trimmed)
      })
    : FAKE_BGM_SHOWS
  const data = matches.map((show) => {
    return {
      id: show.id,
      type: 2 as const,
      name: show.ja,
      name_cn: show.title,
      summary: show.synopsis,
      series: false,
      nsfw: false,
      locked: false,
      date: `${show.year}-01-01`,
      platform: 'TV',
      images: makeLegacyImages(show.id),
      volumes: 0,
      eps: show.eps,
      total_episodes: show.eps,
      rating: {
        rank: 1,
        total: 1000,
        count: { 8: 100, 9: 400, 10: 500 },
        score: show.rating,
      },
      collection: {
        wish: 100,
        collect: 5000,
        doing: 800,
        on_hold: 50,
        dropped: 20,
      },
      meta_tags: show.tags,
      tags: show.tags.map((name, index) => ({ count: 500 - index * 10, name })),
    }
  })
  return {
    data,
    total: data.length,
    limit: 10,
    offset: 0,
  }
}
