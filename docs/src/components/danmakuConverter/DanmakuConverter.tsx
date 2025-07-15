import type React from 'react'
import { useCallback, useState } from 'react'

// Simple commentsToXml function for client-side use
const commentsToXml = (comments: Array<{ p: string; m: string }>) => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
  const commentElements = comments
    .map((comment) => {
      // Escape XML special characters in comment text
      const escapedText = comment.m
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

      return `    <d p="${comment.p}">${escapedText}</d>`
    })
    .join('\n')

  return `${xmlHeader}
<i>
    <chatserver>chat.bilibili.com</chatserver>
    <chatid>0</chatid>
    <mission>0</mission>
    <maxlimit>1500</maxlimit>
    <state>0</state>
    <real_name>0</real_name>
    <source>k-v</source>
${commentElements}
</i>`
}

interface ConvertedFile {
  name: string
  xmlContent: string
  originalName: string
}

// Type definitions for the exported JSON format from the extension
interface EpisodeComment {
  p: string // time,mode,color format
  m: string // message text
  cid?: number
}

interface EpisodeData {
  title: string
  comments: EpisodeComment[]
  season?: {
    title: string
  }
}

export const DanmakuConverter: React.FC = () => {
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const convertJsonToXml = useCallback(
    (jsonContent: string, fileName: string): ConvertedFile | null => {
      try {
        const episodeData: EpisodeData = JSON.parse(jsonContent)

        if (!episodeData.comments || !Array.isArray(episodeData.comments)) {
          throw new Error('Invalid format: missing comments array')
        }

        // Convert to the format expected by commentsToXml
        const formattedComments = episodeData.comments.map((comment) => ({
          p: comment.p,
          m: comment.m,
        }))

        const xmlContent = commentsToXml(formattedComments)

        // Generate XML filename
        const baseName = fileName.replace(/\.json$/i, '')
        const xmlFileName = `${baseName}.xml`

        return {
          name: xmlFileName,
          xmlContent,
          originalName: fileName,
        }
      } catch (error) {
        console.error('Error converting file:', fileName, error)
        return null
      }
    },
    []
  )

  const handleFiles = useCallback(
    async (files: FileList) => {
      setIsConverting(true)
      const newConvertedFiles: ConvertedFile[] = []

      for (const file of Array.from(files)) {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          try {
            const content = await file.text()
            const converted = convertJsonToXml(content, file.name)
            if (converted) {
              newConvertedFiles.push(converted)
            }
          } catch (error) {
            console.error('Error reading file:', file.name, error)
          }
        }
      }

      setConvertedFiles((prev) => [...prev, ...newConvertedFiles])
      setIsConverting(false)
    },
    [convertJsonToXml]
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files && files.length > 0) {
        handleFiles(files)
      }
    },
    [handleFiles]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragOver(false)

      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        handleFiles(files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }, [])

  const downloadFile = useCallback((file: ConvertedFile) => {
    const blob = new Blob([file.xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }, [])

  const downloadAll = useCallback(() => {
    convertedFiles.forEach((file) => {
      downloadFile(file)
    })
  }, [convertedFiles, downloadFile])

  const clearAll = useCallback(() => {
    setConvertedFiles([])
  }, [])

  return (
    <div className="danmaku-converter max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">弹幕格式转换器</h2>
        <p className="text-gray-600 mb-4">
          将 Danmaku Anywhere 导出的 JSON 格式弹幕文件转换为 XML
          格式，供弹弹Play等应用使用。
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isConverting ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".json"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
          disabled={isConverting}
        />
        <label htmlFor="file-input" className="cursor-pointer block">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            {isConverting ? '转换中...' : '选择 JSON 文件或拖拽到此处'}
          </p>
          <p className="text-sm text-gray-500">支持单个或多个 JSON 文件</p>
        </label>
      </div>

      {/* Results */}
      {convertedFiles.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              转换结果 ({convertedFiles.length} 个文件)
            </h3>
            <div className="space-x-2">
              <button
                onClick={downloadAll}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                下载全部
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                清空
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {convertedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    从 {file.originalName} 转换
                  </p>
                </div>
                <button
                  onClick={() => downloadFile(file)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  下载
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium mb-2">使用说明：</h4>
        <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
          <li>在 Danmaku Anywhere 浏览器扩展中导出弹幕（JSON 格式）</li>
          <li>将导出的 JSON 文件上传到此转换器</li>
          <li>下载转换后的 XML 文件</li>
          <li>将 XML 文件导入到弹弹Play等应用中使用</li>
        </ol>
      </div>
    </div>
  )
}
