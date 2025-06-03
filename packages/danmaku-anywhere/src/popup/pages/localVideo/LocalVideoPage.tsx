import { TabLayout } from '@/content/common/TabLayout'
import { FileUpload } from '@/popup/component/FileUpload'
import { VideoPlayer } from '@/popup/component/videoPlayer/VideoPlayer'
import { useEffect, useMemo, useState } from 'react'

export const LocalVideoPage = () => {
  const [[file], setFiles] = useState<File[]>([])

  const fileUrl = useMemo(() => {
    if (!file) {
      return
    }

    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl])

  return (
    <TabLayout>
      <FileUpload accept=".mp4" onFilesSelected={setFiles} multiple={false} />
      <VideoPlayer
        videoUrl={fileUrl}
        videoType="video/mp4"
        title={file?.type}
      />
    </TabLayout>
  )
}
