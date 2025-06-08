import type { SelectableEpisode } from '@/common/components/DanmakuSelector/DanmakuSelector'
import { useFilterDanmaku } from '@/common/danmaku/queries/useFilterDanmaku'
import { useMatchEpisode } from '@/common/danmaku/queries/useMatchEpisode'
import { TabLayout } from '@/content/common/TabLayout'
import { FileUpload } from '@/popup/component/FileUpload'
import { VideoPlayer } from '@/popup/component/videoPlayer/VideoPlayer'
import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useMemo, useState } from 'react'

export const LocalVideoPage = () => {
  const [[file], setFiles] = useState<File[]>([])
  const [comments, setComments] = useState<CommentEntity[]>()
  const [showDisambiguation, setShowDisambiguation] = useState(false)

  const { fileUrl, fileName } = useMemo(() => {
    if (!file) {
      return {}
    }

    return {
      fileUrl: URL.createObjectURL(file),
      fileName: file.name.substring(0, file.name.lastIndexOf('.')),
    }
  }, [file])

  const matchEpisode = useMatchEpisode()
  const filterDanmaku = useFilterDanmaku()

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl])

  useEffect(() => {
    if (!fileName) return
    matchEpisode.mutate({
      title: fileName,
    }, {
      onSuccess: ({ data }) => {
        switch (data.status) {
          case 'success':
            break
          case 'disambiguation':
            setShowDisambiguation(true)
            break
          case 'notFound':
            break
        }
      }
    })
  }, [fileName])

  const handleSelect = (episode: SelectableEpisode) => {
    filterDanmaku.mutate(episode, {
      onSuccess: (data) => {
        setComments(data.comments)
      },
    })
  }

  return (
    <TabLayout>
      <VideoPlayer
        videoUrl={fileUrl}
        videoType={file?.type}
        title={fileName}
        comments={comments}
        onSelectEpisode={handleSelect}
      >
        {!file && (
          <FileUpload
            accept=".mp4"
            onFilesSelected={setFiles}
            multiple={false}
          />
        )}
      </VideoPlayer>
    </TabLayout>
  )
}
