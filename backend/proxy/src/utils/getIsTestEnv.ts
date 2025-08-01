export const getIsTestEnv = () => {
  try {
    // @ts-ignore
    return process.env.NODE_ENV === 'test' || import.meta.env.MODE === 'test'
  } catch {
    return false
  }
}
