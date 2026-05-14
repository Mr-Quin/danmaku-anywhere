import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_ROOT = path.join(__dirname, '..', 'fixtures')

export function loadJsonFixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES_ROOT, name), 'utf-8')) as T
}

export function loadTextFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_ROOT, name), 'utf-8')
}

export function loadBinaryFixture(name: string): Buffer {
  return readFileSync(path.join(FIXTURES_ROOT, name))
}
