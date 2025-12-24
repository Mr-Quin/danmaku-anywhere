import type { ILogger } from '@/common/Logger'
import type {
  Options,
  OptionsSchema,
  UpgradeContext,
  Version,
} from '@/common/options/OptionsService/types'

export function migrateOptions<T extends OptionsSchema>(
  fromOption: Options<T>,
  versions: Version[],
  logger: ILogger,
  context: UpgradeContext
): Options<T> {
  const getNextVersion = (version: number): Version | undefined => {
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
      data: nextVersion.upgrade(currentOptions.data, context) as T, // only the last upgrade will be of type T
      version: nextVersion.version,
    }

    nextVersion = getNextVersion(currentOptions.version)
  }

  logger.debug(`At latest version ${currentOptions.version}`)
  return currentOptions
}
