import { useState } from 'react'

function DanmakuConverter() {
  const [inputData, setInputData] = useState('')
  const [animeTitle, setAnimeTitle] = useState('')
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [convertedData, setConvertedData] = useState<any | null>(null)
  const [errors, setErrors] = useState({ animeTitle: '' }) // Add errors object

  const convertData = () => {
    try {
      const parsedData = JSON.parse(inputData)

      if (!Array.isArray(parsedData.danmuku)) {
        throw new Error('Invalid danmuku format')
      }

      const comments = parsedData.danmuku.map((commentArray: any) => {
        if (commentArray.length < 6) {
          throw new Error('Incomplete comment data')
        }

        const time = parseFloat(commentArray[0])
        const mode =
          commentArray[1] === 'top' || commentArray[1] === 'bottom'
            ? commentArray[1]
            : 'rtl'
        const color = commentArray[2].toUpperCase()
        const text = commentArray[4]
        const user = commentArray[5]

        if (!/^#[0-9A-F]{6}$/.test(color)) {
          throw new Error('Invalid color format')
        }

        return {
          time,
          mode,
          color,
          text,
          user: user || undefined, // Make user optional
        }
      })

      if (!episodeTitle && !parsedData.episodeNumber) {
        throw new Error('One of episodeTitle or episodeNumber is required')
      }

      const result = {
        comments,
        animeTitle,
        episodeTitle: episodeTitle || undefined, // Make episodeTitle optional
        episodeNumber: parsedData.episodeNumber || undefined, // Make episodeNumber optional
      }

      setConvertedData(result)
    } catch (error) {
      console.error('Error parsing or validating data:', error)
      // Handle the error in the UI (show an error message)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setInputData(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileChange({ target: { files: [file] } } as any)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (animeTitle.trim() === '') {
      setErrors({ animeTitle: 'Anime title is required' })
    } else {
      setErrors({ animeTitle: '' })
      convertData()
    }
  }

  const downloadData = () => {
    if (convertedData) {
      const json = JSON.stringify(convertedData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'danmaku.json'
      link.click()
    }
  }

  return (
    <div className="danmaku-converter">
      <form onSubmit={handleSubmit} className="converter-form">
        <div className="form-group">
          <label htmlFor="animeTitle">Anime Title</label>
          <input
            type="text"
            id="animeTitle"
            value={animeTitle}
            onChange={(e) => setAnimeTitle(e.target.value)}
            required
          />
          {errors.animeTitle && (
            <span className="error">{errors.animeTitle}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="episodeTitle">Episode Title (optional)</label>
          <input
            type="text"
            id="episodeTitle"
            value={episodeTitle}
            onChange={(e) => setEpisodeTitle(e.target.value)}
          />
        </div>

        <textarea
          className="data-input"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="fileInput"
        />
        <label htmlFor="fileInput" className="file-upload">
          Choose File
        </label>

        <button type="submit">Convert</button>
      </form>

      {convertedData && (
        <div className="result-section">
          <h2>Converted Data:</h2>
          <pre className="result-data">
            {JSON.stringify(convertedData, null, 2)}
          </pre>
          <button onClick={downloadData}>Download</button>
        </div>
      )}
    </div>
  )
}

export default DanmakuConverter
