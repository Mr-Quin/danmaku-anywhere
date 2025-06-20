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
}
