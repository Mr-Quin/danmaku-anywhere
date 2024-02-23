import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pkg from 'fs-extra'

const { emptyDir } = pkg

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'))
)

const packageName = packageJson.name.replace(/@.*?\//, '') // Removing scope if present
const packageVersion = packageJson.version

const tarFileName = `${packageName}-${packageVersion}.tar.gz`
const zipFileName = `${packageName}-${packageVersion}.zip`

const buildPath = path.resolve(__dirname, '../build')
const packagePath = path.resolve(__dirname, '../package')

// create package folder
await fs.promises.mkdir(packagePath, { recursive: true })

// empty package folder
await emptyDir(packagePath)

exec(`tar -czf ${packagePath}/${tarFileName} -C ${buildPath} .`, (error) => {
  if (error) {
    console.error('Error occurred:', error)
    return
  }
  console.log(`Package created: ${tarFileName}`)
})

exec(`7z a ${packagePath}/${zipFileName} ${buildPath}/*`, (error) => {
  if (error) {
    console.error('Error occurred:', error)
    return
  }
  console.log(`Package created: ${zipFileName}`)
})
