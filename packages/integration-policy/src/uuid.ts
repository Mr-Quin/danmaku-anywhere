export const getRandomUUID = () => {
  try {
    return globalThis.crypto.randomUUID()
  } catch (e) {
    console.warn(
      'Failed to generate UUID using crypto.randomUUID, falling back to Math.random',
      e
    )
    // fallback to Math.random if crypto.randomUUID is not available
    const generateUUID = (): string => {
      const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      return template.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
    return generateUUID()
  }
}
