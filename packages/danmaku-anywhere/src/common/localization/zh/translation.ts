import type enTranslation from '../en/translation'

const common = {
  common: {
    add: '添加',
    apiEndpoint: 'API 接口',
    apply: '应用',
    cancel: '取消',
    confirmDeleteMessage: '确定要删除 "{{name}}" 吗？',
    confirmDeleteTitle: '确认删除',
    copyToClipboard: '复制到剪贴板',
    copy: '复制',
    delete: '删除',
    enable: '启用',
    export: '导出',
    filter: '过滤',
    import: '导入',
    reset: '重置',
    save: '保存',
    search: '搜索',
    searchResults: '搜索结果',
    time: '时间',
    test: '测试',
    regex: '正则表达式',
    regexShort: '正则',
    success: '成功',
    failed: '失败',
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
      fetchingNext: '正在获取下一集弹幕',
      refreshingDanmaku: '正在刷新弹幕',
    },
    comment_one: '弹幕',
    comment_other: '弹幕',
    commentContent: '弹幕内容',
    commentCounted_one: '{{count}}条弹幕',
    commentCounted_other: '{{count}}条弹幕',
    disable: '隐藏弹幕',
    enable: '显示弹幕',
    error: {
      containerNotFound: '未找到弹幕容器',
      videoNotFound: '未找到视频元素',
      nextEpisodeNotFound: '未找到下一集',
    },
    tooltip: {
      nextEpisode: '只能在手动模式下使用',
    },
    mount: '装填弹幕',
    export: '导出弹幕',
    noComments: '弹幕列表为空',
    refresh: '刷新弹幕',
    nextEpisode: '下一集',
    style: '弹幕样式',
    type: {
      Custom: '自定义',
      DDP: '弹弹Play',
    },
    unmount: '卸载弹幕',
  },
  integration: {
    name: '适配',
    type: {
      None: '无',
      Plex: 'Plex',
    },
    autoMode: '自动模式',
    alert: {
      usingIntegration: '以适配{{name}}',
      titleMapping: '获取映射标题：{{originalTitle}} -> {{mappedTitle}}',
      titleMappingError: '获取标题映射失败：{{title}}，跳过',
      search: '搜索番剧：{{title}}',
      searchError: '搜索番剧失败：{{message}}',
      searchResultEmpty: '没有找到标题为 {{title}} 的番剧',
      openSearch: '打开搜索页面',
      playing: '播放中：{{title}}',
    },
  },
}

const pages = {
  configPage: {
    editor: {
      helper: {
        mediaQuery: '用来选择视频元素, 一般为“video”',
        integration: '启用对应的适配。如果你不清楚这是什么，请保持默认设置“无”',
        urlPattern:
          '用来匹配视频页面，一般为视频网站的网址。格式：https://example.com/*。如果视频处于iframe中，此处需iframe的地址',
      },
      mediaQuery: '视频元素',
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
    noAnime: '没有可用的番剧',
    noResult: "没有找到标题为 '{{filter}}' 的番剧",
    deleteAll: '删除所有弹幕',
    confirmDeleteMessage: '确定要删除所有弹幕吗？',
    upload: {
      confirm: '确认导入',
      dialogTitle: '确定要导入这些弹幕吗？',
      parsedEntries: '发现剧集：',
      parseError_one: '{{count}}个文件格式不正确',
      parseError_other: '{{count}}个文件格式不正确',
      selectFiles: '选择弹幕文件',
      importCustom: '导入自定义弹幕',
      importExported: '导入弹幕',
      exportAll: '导出所有弹幕',
      exportAnime: '导出全集弹幕',
      success: '导入成功',
      upload: '导入弹幕',
      alert: {
        parseError: '文件解析失败',
      },
      help: {
        selectFiles:
          '选择要导入的弹幕文件，也可以将文件拖放到此区域。文件名将用为番剧名称。支持.json和.xml文件',
        importCustom: '导入自定义弹幕。自定义弹幕格式请参考文档',
        importExported:
          '导入之前导出的弹幕。如果导入的弹幕与现有的弹幕有重复，现有的弹幕将被覆盖',
      },
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
    chConvert: {
      name: '简繁转换',
      simplified: '转换成简体',
      traditional: '转换成繁体',
      none: '不转换',
    },
    theme: {
      colorMode: {
        name: '色彩模式',
        light: '浅色',
        dark: '深色',
        system: '跟随系统',
      },
    },
    pages: {
      danmakuSource: '弹幕来源',
      permissions: '权限设置',
      theme: 'UI主题',
    },
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
    filterLevel: '屏蔽等级',
    name: '弹幕设置',
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
      speed: '弹幕飞过屏幕的速度。 “1”最慢，“5”最快。',
    },
    filtering: {
      name: '屏蔽设置',
      addFilterPattern: '添加屏蔽词',
      enterFilterPattern: '输入屏蔽词，正则以 "/" 开头和结尾',
      testFilterPatterns: '测试屏蔽词',
      enterTestText: '输入测试文本',
      testResultExclude: '这段文本将被过滤',
      testResultInclude: '这段文本不会被过滤',
      patternList: '屏蔽词列表',
      validation: {
        patternEmpty: '屏蔽词不能为空',
        duplicate: '屏蔽词已存在',
        invalidRegex: '无效正则表达式',
      },
      tooltip: {
        noFilter: '不存在屏蔽词，请先添加一些屏蔽词以进行测试',
      },
    },
  },
  tabs: {
    config: '装填配置',
    danmaku: '弹幕列表',
    mount: '装填弹幕',
    search: '搜索番剧',
    selector: '修正匹配',
    style: '弹幕设置',
  },
}

const translation: typeof enTranslation = {
  ...common,
  ...domain,
  ...pages,
}

export default translation
