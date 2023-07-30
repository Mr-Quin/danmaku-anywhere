import { useLocalDanmaku } from '@/common/hooks/danmaku/useLocalDanmaku'

export const DanmakuDashboard = () => {
  const { allDanmakuArray, deleteDanmaku, isLoading } = useLocalDanmaku()

  console.log(allDanmakuArray, 'isLoading', isLoading)

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      <p>Loaded {allDanmakuArray.length} danmaku</p>
      <table>
        <thead>
          <tr>
            <th>Anime</th>
            <th>Danmaku Count</th>
            <th>Episode</th>
            <th>Episode Id</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {allDanmakuArray.map((danmaku) => {
            return (
              <tr>
                <td>{danmaku.meta.animeTitle}</td>
                <td>{danmaku.count}</td>
                <td>{danmaku.meta.episodeTitle}</td>
                <td>{danmaku.meta.episodeId}</td>
                <td>
                  <button onClick={() => deleteDanmaku(danmaku.meta.episodeId)}>
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
