import type enTranslation from '../en/translation'

const common = {
  common: {
    add: '添加',
    apply: '应用',
    cancel: '取消',
    confirmDeleteMessage: '确定要删除 "{{name}}" 吗？',
    confirmDeleteTitle: '确认删除',
    copyToClipboard: '复制到剪贴板',
    delete: '删除',
    enable: '启用',
    export: '导出',
    'export.all': '导出全部',
    filter: '过滤',
    import: '导入',
    reset: '重置',
    save: '保存',
    search: '搜索',
    searchResults: '搜索结果',
    time: '时间',
  },
  error: {
    unknown: '出了一些问题。',
  },
}

const domain = {
  anime: {
    episode: '集',
    episode_one: '集',
    episode_other: '集',
    'episode.select': '选择剧集',
    episodeCounted_one: '{{count}}集',
    episodeCounted_other: '{{count}}集',
    name: '番剧',
    title: '标题',
  },
  configs: {
    alert: {
      created: '配置已创建',
      deleted: '配置已删除',
      deleteError: '删除配置失败：{{message}}',
      updated: '配置已更新',
    },
    config_one: '配置',
    config_other: '配置',
  },
  danmaku: {
    alert: {
      deleted: '弹幕已删除',
      deleteError: '弹幕删除失败：{{message}}',
      exported: '弹幕已导出',
      exportError: '弹幕导出失败：{{message}}',
      mounted: '弹幕已装填：{{name}} ({{count}})',
      mountError: '装填弹幕失败：{{message}}',
      refreshed: '弹幕已刷新：{{name}} ({{count}})',
      unmounted: '弹幕已卸载',
      fetchError: '获取弹幕失败：{{message}}',
    },
    comment_one: '弹幕',
    comment_other: '弹幕',
    commentContent: '弹幕内容',
    commentCounted_one: '{{count}}条弹幕',
    commentCounted_other: '{{count}}条弹幕',
    disable: '关闭弹幕',
    enable: '开启弹幕',
    error: {
      containerNotFound: '未找到弹幕容器',
      videoNotFound: '未找到视频元素',
    },
    mount: '装填弹幕',
    noComments: '弹幕列表为空',
    refresh: '刷新弹幕',
    style: '弹幕样式',
    type: {
      Custom: '自定义',
      DDP: '弹弹Play',
    },
    unmount: '卸载弹幕',
  },
  integration: {
    autoMode: '自动模式',
    alert: {
      usingIntegration: '以适配{{name}}',
      titleMapping: '获取映射标题：{{originalTitle}} -> {{mappedTitle}}',
      titleMappingError: '获取标题映射失败：{{title}}，跳过',
      search: '搜索番剧：{{title}}',
      searchError: '搜索番剧失败：{{message}}',
      searchResultEmpty: '没有找到标题为 {{title}} 的动漫',
      openSearch: '打开搜索页面',
      playing: '播放中：{{title}}',
    },
  },
}

const pages = {
  configPage: {
    editor: {
      helper: {
        'name.create': '创建后无法更改名称',
        'name.edit': '如要更改名称，请删除该配置后重新添加',
      },
      mediaQuery: 'Media Query',
      name: '名称',
      pattern: '模式',
      'pattern.add': '添加模式',
      title: {
        create: '添加配置',
        edit: '编辑{{name}}',
      },
      urlPatterns: 'URL 模式',
    },
    name: '装填配置',
  },
  danmakuPage: {
    animeList: '剧集列表',
    noAnime: '没有可用的动漫',
    noResult: "没有找到标题为 '{{filter}}' 的动漫",
    upload: {
      confirm: '确认导入',
      dialogTitle: '确定要导入这些弹幕吗？',
      parsedEntries: '发现剧集：',
      parseError_one: '{{count}}个文件格式不正确',
      parseError_other: '{{count}}个文件格式不正确',
      selectFile: '选择弹幕文件',
      success: '导入成功',
      upload: '导入弹幕',
    },
  },
  mountPage: {
    addMountConfig: '添加装填配置以启用控制器',
    instructions: '选择剧集并点击装填。',
    manualModeOnly:
      '此页面与“{{integration}}”适配。请先关闭自动模式以使用手动装填。',
    noActiveTab: '当前页面为空',
    noDanmaku: '弹幕列表为空',
    noDanmakuHelp: '搜索弹幕以启用控制器',
    pageTitle: '装填控制器',
    unavailable: '当前页面没有装填配置。可能配置已禁用，或者配置不正确。',
    unavailableTips: '如果在更新扩展后出现此问题，请尝试重启浏览器。',
    unsupported: '不支持内置页面',
  },
  optionsPage: {
    language: '语言',
    name: '设置',
  },
  searchPage: {
    episode: '集数',
    name: '搜索番剧',
    saveMapping: '保存标题映射',
    title: '番剧标题',
  },
  selectorPage: {
    noAnimeFound: '没有可供选择的内容',
    saveMapping: '记住我的选择',
    saveMappingAs: '将“{{originalName}}”记录为“{{newName}}”',
    selectAnime: '找到多个匹配项：{{name}}，请选择',
  },
  stylePage: {
    filterLevel: '过滤等级',
    name: '弹幕样式',
    offset: '时间轴',
    opacity: '不透明度',
    'safeZone.bottom': '底部',
    'safeZone.top': '顶部',
    safeZones: '防挡字幕',
    show: '显示弹幕',
    size: '字体大小',
    speed: '弹幕速度',
    tooltip: {
      filterLevel:
        '限制屏幕上显示的弹幕数量。 "0" 表示显示所有弹幕，每个级别减少20%显示的弹幕数量。',
      name: '弹幕风格',
      offset: '弹幕出现的时间提前量。 正值使弹幕延后出现，负值使弹幕提前出现。',
      opacity: '“0”为透明，“1”为不透明',
      'safeZone.bottom': '视频底部不会包含弹幕的百分比区域',
      'safeZone.top': '视频顶部不会包含弹幕的百分比区域',
      safeZones: '安全区域',
      show: '显示弹幕',
      size: '弹幕的字体大小。',
      speed: '弹幕飞过屏幕的速度。 “1”是最慢的，“5”是最快的。',
    },
  },
  tabs: {
    config: '装填配置',
    danmaku: '弹幕列表',
    mount: '装填弹幕',
    search: '搜索番剧',
    selector: '修正匹配',
    style: '弹幕样式',
  },
}

const translation: typeof enTranslation = {
  ...common,
  ...domain,
  ...pages,
}

export default translation
