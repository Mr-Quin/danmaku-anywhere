import type { PublicState, ReleaseAsset } from '../core/types.js'

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string
    }
    throw new Error(body.error ?? `request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function getState(): Promise<PublicState> {
  return unwrap(await fetch('/api/state'))
}

export async function getReleases(): Promise<ReleaseAsset[]> {
  return unwrap(await fetch('/api/releases'))
}

export async function downloadBuild(tag: string): Promise<PublicState> {
  return unwrap(
    await fetch('/api/builds/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
  )
}

export async function setActive(tag: string): Promise<PublicState> {
  return unwrap(
    await fetch('/api/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
  )
}

export async function removeBuild(tag: string): Promise<PublicState> {
  return unwrap(
    await fetch(`/api/builds/${encodeURIComponent(tag)}`, { method: 'DELETE' })
  )
}

export async function updateToken(githubToken: string): Promise<PublicState> {
  return unwrap(
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubToken }),
    })
  )
}
