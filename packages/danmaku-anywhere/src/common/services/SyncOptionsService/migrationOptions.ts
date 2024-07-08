import type { Logger } from '@/common/services/Logger'
import type {
  Options,
  OptionsSchema,
  Version,
} from '@/common/services/SyncOptionsService/types'

export function migrateOptions<T extends OptionsSchema>(
  fromOption: Options<T>,
  versions: Version<T>[],
  logger: typeof Logger
): Options<T> {
  const getNextVersion = (version: number): Version<T> | undefined => {
    const biggerVersions = versions.filter((v) => v.version > version)

    return biggerVersions.length > 0
      ? biggerVersions.reduce((acc, v) => (acc.version > v.version ? v : acc))
      : undefined
  }

  let currentOptions = fromOption
  let nextVersion = getNextVersion(currentOptions.version)

  while (nextVersion) {
    logger.debug(
      `Upgrading from version ${currentOptions.version} to ${nextVersion.version}`
    )

    currentOptions = {
      data: nextVersion.upgrade(currentOptions.data),
      version: nextVersion.version,
    }

    nextVersion = getNextVersion(currentOptions.version)
  }

  logger.debug(`At latest version ${currentOptions.version}`)
  return currentOptions
}
