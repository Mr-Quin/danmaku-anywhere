export const SERVICE_TYPES = {
  SeasonService: Symbol.for('SeasonService'),
  DanmakuService: Symbol.for('DanmakuService'),
  TitleMappingService: Symbol.for('TitleMappingService'),
  ProviderService: Symbol.for('ProviderService'),
  KazumiService: Symbol.for('KazumiService'),
  IconService: Symbol.for('IconService'),
  GenAIService: Symbol.for('GenAIService'),
  ProviderRegistry: Symbol.for('ProviderRegistry'),

  // Options
  ExtensionOptionsService: Symbol.for('ExtensionOptionsService'),
  ProviderConfigService: Symbol.for('ProviderConfigService'),
  MountConfigService: Symbol.for('MountConfigService'),
  DanmakuOptionsService: Symbol.for('DanmakuOptionsService'),

  // Providers
  BilibiliService: Symbol.for('BilibiliService'),
  TencentService: Symbol.for('TencentService'),
  DanDanPlayService: Symbol.for('DanDanPlayService'),
  MacCmsProviderService: Symbol.for('MacCmsProviderService'),

  // Factories
  Factory_BilibiliService: Symbol.for('Factory_BilibiliService'),
  Factory_TencentService: Symbol.for('Factory_TencentService'),
  Factory_DanDanPlayService: Symbol.for('Factory_DanDanPlayService'),
  Factory_MacCmsProviderService: Symbol.for('Factory_MacCmsProviderService'),

  // Managers
  RpcManager: Symbol.for('RpcManager'),
  PortsManager: Symbol.for('PortsManager'),
  AlarmManager: Symbol.for('AlarmManager'),
  NetRequestManager: Symbol.for('NetRequestManager'),
  ScriptingManager: Symbol.for('ScriptingManager'),
  ContextMenuManager: Symbol.for('ContextMenuManager'),
  OptionsManager: Symbol.for('OptionsManager'),
}
