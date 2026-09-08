import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import { RpcException } from '@/common/rpc/types'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { RpcManager } from './RpcManager'

/**
 * RpcManager.setup() wires one handler map to both chrome.runtime.onMessage
 * and onMessageExternal, so every command on it is reachable from outside the
 * extension. The relay handler map only listens on onMessage. This test
 * captures both maps as they are actually registered and pins their key sets,
 * so a command added to the wrong map, or moved between them, fails here.
 */

vi.mock('@/common/rpc/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/common/rpc/server')>()
  return {
    ...actual,
    createRpcServer: vi.fn((handlers: Record<string, unknown>) => ({
      handlers,
      listen: vi.fn(),
    })),
  }
})

const EXTERNALLY_REACHABLE_COMMANDS = [
  'authDeleteAccount',
  'authGetSession',
  'authSignIn',
  'authSignOut',
  'authSignUp',
  'backupExport',
  'backupImport',
  'bilibiliSetCookies',
  'bookmarkAdd',
  'bookmarkDelete',
  'bookmarkDeleteBySeason',
  'bookmarkGetAll',
  'bookmarkRefresh',
  'cloudBackupCreate',
  'cloudBackupDownload',
  'cloudBackupList',
  'danmakuPurgeCache',
  'dataWipeDanmaku',
  'episodeDelete',
  'episodeDeleteCustom',
  'episodeFetch',
  'episodeFetchBySeason',
  'episodeFilter',
  'episodeFilterCustom',
  'episodeFilterCustomLite',
  'episodeFilterLite',
  'episodeImport',
  'episodeMatch',
  'episodePreloadNext',
  'exportDebugData',
  'extractTitle',
  'fetchImage',
  'genericFetchDanmakuForUrl',
  'genericVodSearch',
  'getActiveTabUrl',
  'getAlarm',
  'getConfigDanmuIcu',
  'getConfigMacCms',
  'getExtensionManifest',
  'getFontList',
  'getFrameId',
  'getPlatformInfo',
  'iconSet',
  'kazumiGetChapters',
  'kazumiSearchContent',
  'mediaParseUrl',
  'mountConfigCreate',
  'mountConfigGetAll',
  'occlusionAddCorsRule',
  'occlusionDeleteModel',
  'occlusionDownloadModel',
  'occlusionGetModels',
  'occlusionRefreshModels',
  'occlusionRemoveCorsRule',
  'occlusionResolveModel',
  'openPopupInNewTab',
  'openPopupInNewWindow',
  'providerApplyUpdates',
  'providerConfigDelete',
  'providerDeleteUserManifest',
  'providerGetManifestSource',
  'providerGetManifestSpec',
  'providerGetPendingUpdates',
  'providerListManifests',
  'providerProbeLogin',
  'providerRefreshCatalog',
  'providerSaveUserManifest',
  'providerTestRunDanmaku',
  'providerTestRunEpisodes',
  'providerTestRunSearch',
  'providerValidateManifest',
  'remoteLog',
  'seasonDelete',
  'seasonFilter',
  'seasonGetAll',
  'seasonMapAdd',
  'seasonMapDelete',
  'seasonMapDeleteMany',
  'seasonMapGetAll',
  'seasonMapPut',
  'seasonRefresh',
  'seasonSearch',
  'seasonUpsert',
  'setHeaders',
  'testAiProvider',
].sort()

const INTERNAL_ONLY_RELAY_COMMANDS = [
  'relay:command:controllerReady',
  'relay:command:debugSkipButton',
  'relay:command:enterPip',
  'relay:command:getSegmentationStats',
  'relay:command:mount',
  'relay:command:seek',
  'relay:command:setOcclusionDebugOverlay',
  'relay:command:show',
  'relay:command:start',
  'relay:command:syncPanelState',
  'relay:command:unmount',
  'relay:event:occlusionStatus',
  'relay:event:playerReady',
  'relay:event:playerUnload',
  'relay:event:preloadNextEpisode',
  'relay:event:requestPanelState',
  'relay:event:showPopover',
  'relay:event:userInteraction',
  'relay:event:videoChange',
  'relay:event:videoRemoved',
  'relay:event:videoStateChange',
].sort()

function buildRpcManager() {
  const container = createTestContainer(
    [backgroundContainerModule],
    [{ identifier: LoggerSymbol, value: silentLogger }]
  )
  return container.get(RpcManager)
}

async function importMockedServer() {
  return vi.mocked((await import('@/common/rpc/server')).createRpcServer)
}

describe('RpcManager command surface', () => {
  it('registers exactly the externally-reachable command handler map and the internal-only relay map', async () => {
    const createRpcServer = await importMockedServer()
    const rpcManager = buildRpcManager()

    rpcManager.setup()

    expect(createRpcServer).toHaveBeenCalledTimes(2)
    const [[commandHandlers], [relayHandlers]] = createRpcServer.mock.calls

    expect(Object.keys(commandHandlers).sort()).toEqual(
      EXTERNALLY_REACHABLE_COMMANDS
    )
    expect(Object.keys(relayHandlers).sort()).toEqual(
      INTERNAL_ONLY_RELAY_COMMANDS
    )
  })

  it('listens to onMessage and onMessageExternal on the externally-reachable server only', async () => {
    const createRpcServer = await importMockedServer()
    const rpcManager = buildRpcManager()

    rpcManager.setup()

    const [commandServer, relayServer] = createRpcServer.mock.results.map(
      (result) => result.value as { listen: ReturnType<typeof vi.fn> }
    )

    expect(commandServer.listen).toHaveBeenCalledWith(chrome.runtime.onMessage)
    expect(commandServer.listen).toHaveBeenCalledWith(
      chrome.runtime.onMessageExternal
    )
    expect(relayServer.listen).toHaveBeenCalledWith(chrome.runtime.onMessage)
    expect(relayServer.listen).not.toHaveBeenCalledWith(
      chrome.runtime.onMessageExternal
    )
  })

  it('rejects getFrameId when the sender has no frame id', async () => {
    const createRpcServer = await importMockedServer()
    const rpcManager = buildRpcManager()
    rpcManager.setup()
    const [[commandHandlers]] = createRpcServer.mock.calls

    await expect(
      commandHandlers.getFrameId(undefined, {}, () => {})
    ).rejects.toThrow(RpcException)
  })

  it('rejects iconSet when the sender tab has no id', async () => {
    const createRpcServer = await importMockedServer()
    const rpcManager = buildRpcManager()
    rpcManager.setup()
    const [[commandHandlers]] = createRpcServer.mock.calls

    await expect(
      commandHandlers.iconSet({ state: 'active', count: 1 }, {}, () => {})
    ).rejects.toThrow(RpcException)
  })
})
