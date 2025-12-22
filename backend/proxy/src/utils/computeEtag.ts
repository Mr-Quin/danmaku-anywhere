export async function computeEtag(body: unknown): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(body))
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const newETag =
    '"' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('') + '"'

  return newETag
}
