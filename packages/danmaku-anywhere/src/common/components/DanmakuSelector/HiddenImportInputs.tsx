import type { ReactElement, RefObject } from 'react'
import { VALID_EXTENSIONS } from '@/common/components/ImportPageCore/useDanmakuImport'

interface HiddenImportInputsProps {
  fileInputRef: RefObject<HTMLInputElement | null>
  folderInputRef: RefObject<HTMLInputElement | null>
  onFiles: (files: File[]) => void
}

export function HiddenImportInputs({
  fileInputRef,
  folderInputRef,
  onFiles,
}: HiddenImportInputsProps): ReactElement {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      onFiles(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  return (
    <>
      <input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={handleChange}
        accept={[...VALID_EXTENSIONS, '.zip'].join(',')}
        multiple
        data-testid="danmaku-import-file-input"
      />
      <input
        type="file"
        hidden
        ref={folderInputRef}
        onChange={handleChange}
        // @ts-expect-error non-standard attribute, but allows selecting folder to upload
        webkitdirectory=""
      />
    </>
  )
}
