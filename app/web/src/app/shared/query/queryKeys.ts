export const queryKeys = {
  kazumi: {
    manifest: {
      all: () => ['kazumi', 'manifest', 'all'],
      id: (id: string) => ['kazumi', 'manifest', id],
    },
    local: {
      all: () => ['kazumi', 'local', 'all'],
    },
    settings: {
      order: () => ['kazumi', 'settings', 'order'],
    },
    search: (policy: string, query: string) => [
      'kazumi',
      policy,
      'search',
      query,
    ],
    getChapters: (policy: string, chapters: string) => [
      'kazumi',
      policy,
      'getChapters',
      chapters,
    ],
    scrapeVideos: (url: string) => ['kazumi', 'scrapeVideos', url],
  },
  bangumi: {
    calendar: () => ['bangumi', 'calendar'],
    trending: (limit?: number, offset?: number) => [
      'bangumi',
      'trending',
      limit,
      offset,
    ],
    trendingInfinite: () => ['bangumi', 'trending', 'infinite'],
    subject: {
      details: (subjectId: number) => [
        'bangumi',
        'subject',
        'details',
        subjectId,
      ],
      episodes: (subjectId: number) => [
        'bangumi',
        'subject',
        'episodes',
        subjectId,
      ],
      characters: (subjectId: number) => [
        'bangumi',
        'subject',
        'characters',
        subjectId,
      ],
      relations: (subjectId: number) => [
        'bangumi',
        'subject',
        'relations',
        subjectId,
      ],
      staffPersons: (subjectId: number) => [
        'bangumi',
        'subject',
        'staff-persons',
        subjectId,
      ],
      staffPositions: (subjectId: number) => [
        'bangumi',
        'subject',
        'staff-positions',
        subjectId,
      ],
      recommendations: (subjectId: number) => [
        'bangumi',
        'subject',
        'recommendations',
        subjectId,
      ],
      reviews: (subjectId: number) => [
        'bangumi',
        'subject',
        'reviews',
        subjectId,
      ],
      topics: (subjectId: number) => [
        'bangumi',
        'subject',
        'topics',
        subjectId,
      ],
      comments: (subjectId: number) => [
        'bangumi',
        'subject',
        'comments',
        subjectId,
      ],
      collects: (subjectId: number) => [
        'bangumi',
        'subject',
        'collects',
        subjectId,
      ],
    },
  },
}
