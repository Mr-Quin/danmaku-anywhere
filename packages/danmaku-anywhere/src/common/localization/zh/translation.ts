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
    docs: '文档',
    pip: '画中画',
    acknowledge: '知道了',
    duration: {
      day_one: '天',
      day_other: '天',
    },
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
    season: '季',
    episodeTitle: '集标题',
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
      videoNotFound: '未找到视频节点',
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
      DanDanPlay: '弹弹Play',
      Bilibili: '哔哩哔哩',
      Tencent: '腾讯',
      Iqiyi: '爱奇艺',
    },
    unmount: '卸载弹幕',
  },
  integration: {
    name: '适配',
    type: {
      None: '无',
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
    },
  },
  danmakuSource: {
    name: '弹幕来源',
    error: {
      bilibiliAccess: '访问哔哩哔哩失败',
    },
    tooltip: {
      bilibiliNotLoggedIn:
        '未登录哔哩哔哩，获取的剧集信息和弹幕可能受限。请<0>前往B站</0>登录。',
      tencentCookieMissing:
        '获取腾讯视频失败，可能是缺少 Cookie，请先访问<0>腾讯视频</0>并打开任意视频页面以确保 Cookie 正常。',
    },
  },
}

const pages = {
  configPage: {
    editor: {
      helper: {
        mediaQuery: '用来选择视频节点, 一般为“video”',
        integration:
          '启用对应的适配配置。如果你不清楚这是什么，请保持默认设置“无”',
        urlPattern:
          '用来匹配视频页面，一般为视频网站的网址。格式：https://example.com/*。',
      },
      mediaQuery: '视频节点',
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
  integrationPolicyPage: {
    name: '适配配置',
    noIntegration: '当前页面没有可用的适配配置',
    hasIntegration: '当前页面已启用适配配置："{{name}}"',
    create: '添加适配配置',
    edit: '编辑{{name}}',
    parseComplete: '解析完成',
    nodesFound: '找到节点',
    integrationActive: '运行中',
    integrationInactive: '未运行',
    editor: {
      name: '名称',
      titleSection: '匹配标题',
      titleSelector: '标题XPath',
      titleRegex: '标题Regex',
      titleOnly: '仅使用标题匹配',
      season: '匹配季',
      seasonSelector: '季XPath',
      seasonRegex: '季Regex',
      episode: '匹配集数',
      episodeSelector: '集数XPath',
      episodeRegex: '集数Regex',
      episodeTitle: '匹配单集标题',
      episodeTitleSelector: '单集标题XPath',
      episodeTitleRegex: '单集标题Regex',
      advanced: '高级选项',
      quick: '优先',
      helper: {
        titleOnly:
          '勾选后，只使用标题节点匹配番剧。适用与标题包含番剧全部信息的情况，例如标题为文件名。如果番剧信息分散在不同的节点中，请取消勾选。',
        testDisabled: '只能在存在装填配置的页面使用',
      },
    },
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
    searchUsingSimplified: '使用简体中文搜索',
    danmakuSource: {
      bilibili: {
        danmakuTypePreference: '弹幕获取方式',
        help: {
          danmakuTypePreferenceXML:
            'XML：获取速度快，但是弹幕数量较少。根据视频类型，500-10000条不等。',
          danmakuTypePreferenceProtobuf:
            'Protobuf：获取速度较慢，但是弹幕数量多，每分钟可达1000条。视频越长，速度越慢。',
        },
      },
      dandanplay: {
        useProxy: '使用代理',
      },
    },
    retentionPolicy: {
      enabled: '启用缓存策略',
      purgeNow: '立即清理',
      deleteCommentsAfter: '弹幕缓存时间',
      tooltip: {
        nextPurge: '下次清理时间：{{time}}',
        deleteCommentsAfter: '超过指定天数的弹幕将被删除。0表示从不删除。',
      },
      alert: {
        nDanmakuDeleted: '已删除{{count}}条弹幕',
      },
    },
    hotkeys: {
      addHotkey: '添加快捷键',
      enterKey: '输入快捷键',
      keymap: {
        toggleEnableDanmaku: '显示/隐藏弹幕',
        loadNextEpisodeComments: '下一集',
        refreshComments: '刷新弹幕',
        unmountComments: '卸载弹幕',
        togglePip: '画中画（实验）',
      },
    },
    pages: {
      danmakuSource: '弹幕来源',
      theme: 'UI主题',
      hotkeys: '快捷键',
      retentionPolicy: '缓存策略',
    },
  },
  searchPage: {
    parse: {
      name: '解析链接',
      parse: '解析',
      videoUrl: '视频链接',
      parseResult: '解析结果',
      import: '获取弹幕',
      tooltip: {
        videoUrl:
          '仅支持解析番剧，电影等非用户上传类视频。支持来源：哔哩哔哩、腾讯视频',
      },
      error: {
        invalidUrl: '无效的链接',
      },
      alert: {
        parseError: '解析失败',
        importSuccess: '导入成功',
      },
    },
    retrySearch: '重试',
    episode: '集数',
    name: '搜索番剧',
    saveMapping: '保存标题映射',
    title: '番剧标题',
    convertedTitle: '转换后的标题',
    error: {
      noProviders: '没有启用的弹幕来源，请在设置中启用',
      noResultFound: '没有找到结果, 请尝试其他关键词',
    },
  },
  selectorPage: {
    noAnimeFound: '没有可供选择的内容',
    saveMapping: '记住我的选择',
    saveMappingAs: '将“{{originalName}}”记录为“{{newName}}”',
    selectAnime: '找到多个匹配项：{{name}}，请选择',
  },
  stylePage: {
    limitPerSecond: '每秒最大弹幕数量',
    disableLimit: '不限制',
    name: '弹幕设置',
    offset: '时间轴（毫秒）',
    opacity: '不透明度',
    'safeZone.bottom': '底部',
    'safeZone.top': '顶部',
    safeZones: '防挡字幕',
    size: '字体大小',
    speed: '弹幕速度',
    tooltip: {
      limitPerSecond:
        '每秒新增显示的弹幕不超过此值。如果弹幕过多导致卡顿，可以适当调低此值。“0”表示不显示弹幕，“不限制”表示显示所有弹幕。',
      name: '弹幕风格',
      offset: '弹幕出现的时间提前量。 正值使弹幕延后出现，负值使弹幕提前出现。',
      opacity: '“0”为透明，“1”为不透明',
      'safeZone.bottom': '视频底部不会包含弹幕的百分比区域',
      'safeZone.top': '视频顶部不会包含弹幕的百分比区域',
      safeZones: '安全区域',
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
    integrationPolicy: '适配配置',
  },
}

const translation: typeof enTranslation = {
  ...common,
  ...domain,
  ...pages,
}

export default translation
