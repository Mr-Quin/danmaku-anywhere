import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'))
)

const packageName = packageJson.name.replace(/@.*?\//, '') // Removing scope if present
const packageVersion = packageJson.version

const tarFileName = `${packageName}-${packageVersion}.tar.gz`
const distPath = path.resolve(__dirname, '../dist')

exec(`tar -czf ${tarFileName} -C ${distPath} .`, (error, stdout, stderr) => {
  if (error) {
    console.error('Error occurred:', error)
    return
  }
  console.log(`Package created: ${tarFileName}`)
})
