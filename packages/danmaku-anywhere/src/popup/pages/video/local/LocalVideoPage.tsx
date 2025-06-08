import {
  DanmakuSelector,
  type SelectableEpisode,
} from '@/common/components/DanmakuSelector/DanmakuSelector'
import { FilterButton } from '@/common/components/FilterButton'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TypeSelector } from '@/common/components/TypeSelector'
import { useFilterDanmaku } from '@/common/danmaku/queries/useFilterDanmaku'
import { useMatchEpisode } from '@/common/danmaku/queries/useMatchEpisode'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { FileUpload } from '@/popup/component/FileUpload'
import { VideoPlayer } from '@/popup/component/videoPlayer/VideoPlayer'
import { useStore } from '@/popup/store'
import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HasDanmaku } from '../../mount/components/HasDanmaku'

type SelectDanmakuProps = {
  onSelect: (episode: SelectableEpisode) => void
}

const SelectDanmaku = ({ onSelect }: SelectDanmakuProps) => {
  const { t } = useTranslation()

  const { selectedTypes, animeFilter, setSelectedType, setAnimeFilter } =
    useStore.use.danmaku()

  return (
    <>
      <TabToolbar title={t('mountPage.pageTitle')}>
        <FilterButton onChange={setAnimeFilter} filter={animeFilter} />
        <TypeSelector
          selectedTypes={selectedTypes}
          setSelectedType={setSelectedType}
        />
        {/*<Button*/}
        {/*  variant="outlined"*/}
        {/*  type="button"*/}
        {/*  onClick={() => unmount()}*/}
        {/*  color="warning"*/}
        {/*  disabled={!isMounted}*/}
        {/*>*/}
        {/*  {t('danmaku.unmount')}*/}
        {/*</Button>*/}
      </TabToolbar>
      <Suspense fallback={<FullPageSpinner />}>
        <HasDanmaku>
          <DanmakuSelector
            filter={animeFilter}
            typeFilter={selectedTypes}
            onSelect={onSelect}
            disabled={false}
            // disabled={!isConnected || isMounting}
          />
        </HasDanmaku>
      </Suspense>
    </>
  )
}

export const LocalVideoPage = () => {
  const [[file], setFiles] = useState<File[]>([])
  const [comments, setComments] = useState<CommentEntity[]>()

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
    // matchEpisode.mutate({
    //   mapKey: file.name,
    //   title: fileName,
    // })
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
      >
        {!file && (
          <FileUpload
            accept=".mp4"
            onFilesSelected={setFiles}
            multiple={false}
          />
        )}
      </VideoPlayer>
      <Box>Search</Box>
      <SelectDanmaku onSelect={handleSelect} />
    </TabLayout>
  )
}
