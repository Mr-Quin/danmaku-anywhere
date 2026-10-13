// A store above the version is counted too: a newer build wrote it, and there
// is nothing this build can migrate it to.
export function isStoredAtVersion(stored: unknown, version: number): boolean {
  if (typeof stored !== 'object' || stored === null) {
    return false
  }
  const storedVersion = 'version' in stored ? stored.version : undefined
  // unversioned options predate versioning, so they count as version 0
  if (storedVersion === undefined) {
    return version <= 0
  }
  return typeof storedVersion === 'number' && storedVersion >= version
}
