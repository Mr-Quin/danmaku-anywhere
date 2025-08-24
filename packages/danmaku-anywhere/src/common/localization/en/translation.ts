const common = {
  common: {
    add: 'Add',
    apiEndpoint: 'API Endpoint',
    apply: 'Apply',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    confirmDeleteMessage: 'Are you sure you want to delete "{{name}}"?',
    confirmDeleteTitle: 'Confirm delete',
    copyToClipboard: 'Copy to Clipboard',
    copy: 'copy',
    delete: 'Delete',
    enable: 'Enable',
    export: 'Export',
    backup: 'Backup',
    filter: 'Filter',
    import: 'Import',
    reset: 'Reset',
    save: 'Save',
    search: 'Search',
    searchResults: 'Search Results',
    time: 'Time',
    test: 'Test',
    regex: 'Regex',
    regexShort: 'Regex',
    success: 'Success',
    failed: 'Failed',
    docs: 'Documentation',
    pip: 'Picture-in-Picture',
    acknowledge: 'Ok',
    saving: 'Saving...',
    saved: 'Saved',
    autoSave: 'Auto-save',
    itsEmpty: "There's nothing here...",
    multiselect: 'Multiselect',
    duration: {
      day_one: 'Day',
      day_other: 'Days',
    },
  },
  error: {
    unknown: 'Something went wrong.',
  },
}

const domain = {
  contextMenu: {
    addMountConfig: 'Add Config for this site',
    toggleMountConfig: 'Mount Config: {{name}}',
  },
  anime: {
    episode: 'Episode',
    episode_one: 'Episode',
    episode_other: 'Episodes',
    'episode.select': 'Select Episode',
    episodeCounted_one: '{{count}} episode',
    episodeCounted_other: '{{count}} episodes',
    season: 'Season',
    episodeTitle: 'Episode Title',
    name: 'Anime',
    title: 'Title',
    numericEpisode: 'Episode {{episode}}',
    numericSeason: 'Season {{season}}',
    refreshMetadata: 'Refresh Metadata',
  },
  configs: {
    alert: {
      created: 'Config Created',
      deleted: 'Config Deleted',
      deleteError: 'Failed to delete config: {{message}}',
      updated: 'Config Updated',
    },
    config_one: 'Config',
    config_other: 'Configs',
  },
  danmaku: {
    alert: {
      deleted: 'Danmaku Deleted',
      deleteError: 'Failed to delete danmaku: {{message}}',
      exported: 'Backup Exported',
      exportError: 'Failed to export backup: {{message}}',
      xmlExported: 'XML Exported',
      xmlExportError: 'Failed to export XML: {{message}}',
      mounted: 'Danmaku Mounted: {{name}} ({{count}})',
      mountedMultiple: 'Mounted {{count}} selected danmaku',
      mountError: 'Failed to mount danmaku: {{message}}',
      refreshed: 'Danmaku Refreshed: {{name}} ({{count}})',
      unmounted: 'Danmaku Unmounted',
      fetchError: 'Failed to fetch danmaku: {{message}}',
      fetchingNext: 'Fetching next episode',
      refreshingDanmaku: 'Refreshing danmaku',
    },
    comment_one: 'Comment',
    comment_other: 'Comments',
    commentContent: 'Comment',
    commentCounted_one: '{{count}} comment',
    commentCounted_other: '{{count}} comments',
    disable: 'Hide Danmaku',
    enable: 'Show Danmaku',
    error: {
      containerNotFound: 'Danmaku container not found',
      videoNotFound: 'Video node not found',
    },
    mount: 'Mount',
    backup: 'Export Backup',
    exportXml: 'Export XML',
    noComments: 'No comments',
    refresh: 'Refresh Danmaku',
    style: 'Style',
    type: {
      Custom: 'Custom',
      Backup: 'Backup',
      DanDanPlay: 'DanDanPlay',
      Bilibili: 'Bilibili',
      Tencent: 'Tencent',
      Iqiyi: 'Iqiyi',
    },
    unmount: 'Unmount',
    local: 'Local Danmaku',
  },
  integration: {
    name: 'Integration',
    alert: {
      usingIntegration: 'Using Integration: {{name}}',
      matchedLocalDanmaku: 'Matched local danmaku',
      titleMapping:
        'Mapped title found for {{originalTitle}} -> {{mappedTitle}}',
      titleMappingError: 'Failed to get title mapping for {{title}}, skipping',
      search: 'Searching for anime: {{title}}',
      searchError: 'Failed to search for anime: {{message}}',
      searchResultEmpty: 'No anime found for {{title}}',
      openSearch: 'Open search page',
      usingAI: 'Using AI to parse show information',
      AIResult: 'AI Parsing Result: {{title}}',
      aiDisabledTooPermissive:
        'AI is disabled because the match pattern is too permissive',
    },
    type: {
      None: 'None',
    },
    autoMode: 'Auto Mode',
  },
  danmakuSource: {
    name: 'Danmaku Source',
    error: {
      bilibiliAccess: 'Failed to access Bilibili.',
    },
    tooltip: {
      bilibiliNotLoggedIn:
        'You may get reduced search results and danmaku because you are not currently logged in at Bilibili. Please go to <0>bilibili.com</0> and log in.',
      tencentCookieMissing:
        'Tencent cookies are missing. Please go to <0>v.qq.com</0> and open any video to ensure cookies are set.',
    },
  },
}

const pages = {
  configPage: {
    editor: {
      helper: {
        mediaQuery: 'CSS selector for the video node, normally "video"',
        integration:
          'Enables the selected Integration Policy for this configuration. If you are not sure, leave it as None.',
        urlPattern:
          'URL pattern to match the page. Format: https://example.com/*.',
      },
      mediaQuery: 'Video Node',
      name: 'Name',
      author: 'Author',
      description: 'Description',
      pattern: 'Pattern',
      'pattern.add': 'Add Pattern',
      title: {
        create: 'Add Config',
        edit: 'Edit {{name}}',
      },
      urlPatterns: 'URL Patterns',
      tooPermissive:
        "The match patterns are too permissive, it's recommended to use narrower patterns.",
    },
    import: {
      name: 'Import Config',
      fileUpload: 'Upload File',
      presets: 'Presets',
      hasIntegration: 'Includes Integration',
    },
    name: 'Configs',
    createConfig: 'Create Config',
    backupAll: 'Backup All',
    showIntegration: 'View Integration Policy',
  },
  integrationPolicyPage: {
    name: 'Integration Policy',
    noIntegration:
      'No integration policy is enabled for this page. Please select from existing policies or create a new one.',
    hasIntegration: 'Using Integration: "{{name}}"',
    create: 'Add Integration Policy',
    edit: 'Edit {{name}}',
    parseComplete: 'Parse Complete',
    nodesFound: 'Nodes Found',
    integrationActive: 'Active',
    integrationInactive: 'Inactive',
    aiParsing: 'AI Parsing',
    aiDisabledTooPermissive:
      'AI is disabled because the match pattern is too permissive. Please use narrower match pattern or configure XPath integration.',
    editor: {
      name: 'Name',
      titleSection: 'Select Title',
      titleSelector: 'Title XPath',
      titleRegex: 'Title Regex',
      titleOnly: 'Match title only',
      season: 'Select Season',
      seasonSelector: 'Season XPath',
      seasonRegex: 'Season Regex',
      episode: 'Select Episode',
      episodeSelector: 'Episode XPath',
      episodeRegex: 'Episode Regex',
      episodeTitle: 'Select Episode Title',
      episodeTitleSelector: 'Episode Title XPath',
      episodeTitleRegex: 'Episode Title Regex',
      advanced: 'Advanced Options',
      quick: 'Priority',
      useAI: 'Use AI (Experimental)',
      helper: {
        titleOnly:
          "If checked, only the title node will be used to match the show. Useful if all information is contained in the title, e.g. if the title is the file name. Uncheck if the show's information is spread across different nodes.",
        testDisabled: 'Can only be used on pages with a Mount Config',
        useAI:
          'Try to use AI to parse show information. If parsing fails, try manual configuration.',
      },
    },
  },
  danmakuPage: {
    animeList: 'Anime List',
    noAnime: 'No anime available',
    noResult: "No anime found with title '{{filter}}'",
    confirmDeleteMessage: 'Are you sure to delete the selected Danmaku?',
    backupAll: 'Export All as Backup',
    exportAllXml: 'Export All as XML',
  },
  importPage: {
    confirm: 'Confirm Import',
    import: 'Import Danmaku',
    importDesc:
      'When importing local danmaku, file names will be used as episode names. Supports .json and .xml files',
    willImport_one: 'Will import {{count}} file',
    willImport_other: 'Will import {{count}} files',
    importSuccess_one: 'Successfully imported {{count}} file',
    importSuccess_other: 'Successfully imported {{count}} files',
    importError_one: 'Failed to import {{count}} file',
    importError_other: 'Failed to import {{count}} files',
    parseError: 'Failed to parse file',
    help: {
      dragNDrop1: 'Drag and drop files here',
      dragNDrop2: 'Or click to select files',
    },
  },
  mountPage: {
    addMountConfig: 'Add a mount configuration to enable the controller',
    noActiveTab: 'No active tab',
    noDanmaku: 'No danmaku found',
    noDanmakuHelp: 'Go to Search',
    pageTitle: 'Mount Controller',
  },
  optionsPage: {
    language: 'Language',
    name: 'Options',
    chConvert: {
      name: 'Simplified/Traditional Conversion',
      simplified: 'Convert to simplified',
      traditional: 'Convert to traditional',
      none: 'No conversion',
    },
    theme: {
      colorMode: {
        name: 'Color Mode',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
      },
    },
    enableAnalytics: 'Enable anonymous analytics',
    matchLocalDanmaku: 'Enable matching local Danmaku',
    searchUsingSimplified: 'Search using simplified Chinese',
    danmakuSource: {
      bilibili: {
        danmakuTypePreference: 'Danmaku Type Preference',
        help: {
          danmakuTypePreferenceXML:
            'XML：Faster but fewer danmaku. 500-10000 danmaku depending on video type.',
          danmakuTypePreferenceProtobuf:
            'Protobuf：Slower but more danmaku. Up to 1000 danmaku per minute. Slower for longer videos.',
        },
      },
      macCms: {
        baseUrl: 'API Base URL',
        stripColor: 'Remove danmaku color',
        help: {
          stripColor:
            'Danmaku from this source has random colors, enable this option to set all danmaku to white.',
        },
      },
    },
    retentionPolicy: {
      enabled: 'Enable Retention Policy',
      purgeNow: 'Purge Now',
      deleteCommentsAfter: 'Delete comments older than',
      tooltip: {
        nextPurge: 'Next purge at {{time}}',
        deleteCommentsAfter:
          'Delete comments older than this number of days. Set to 0 to disable.',
      },
      alert: {
        nDanmakuDeleted: '{{count}} danmaku deleted',
      },
    },
    hotkeys: {
      addHotkey: 'Add Hotkey',
      enterKey: 'Enter key',
      keymap: {
        toggleEnableDanmaku: 'Enable/Disable Danmaku',
        refreshComments: 'Refresh Comments',
        unmountComments: 'Unmount Comments',
        togglePip: 'Enter Picture-in-Picture (Experimental)',
      },
    },
    help: {
      docs: 'Documentation',
      version: 'Version',
      feedback: 'Provide feedback',
      reportBug: 'Report Bug',
      graphicalAsset: 'Graphical Assets Illustrator',
    },
    player: {
      showSkipButton: 'Show skip button (OP/ED)',
      showDanmakuTimeline: 'Show danmaku timeline',
    },
    pages: {
      danmakuSource: 'Danmaku Source',
      theme: 'UI Theme',
      hotkeys: 'Hotkeys',
      player: 'Player',
      retentionPolicy: 'Retention Policy',
      advanced: 'Advanced',
      help: '关于',
    },
  },
  searchPage: {
    parse: {
      name: 'Parse URL',
      parse: 'Parse',
      videoUrl: 'Video URL',
      parseResult: 'Parse Result',
      import: 'Import Danmaku',
      tooltip: {
        videoUrl:
          'Only supports parsing of anime, drama, movies, and other non-user uploaded videos. Supported sources: Bilibili, Tencent Video',
      },
      error: {
        invalidUrl: 'Invalid URL',
      },
      alert: {
        parseError: 'Parse failed',
        importSuccess: 'Import successful',
      },
    },
    retrySearch: 'Retry',
    episode: 'Episode',
    name: 'Search Anime',
    title: 'Title',
    convertedTitle: 'Converted Title',
    titleMapping: 'Map Title',
    'titleMapping.confirmation': 'Map `{{original}}` to `{{mapped}}` ?',
    'titleMapping.searchOnly': 'No, just search',
    alert: {
      mappingFailed: 'Failed to save mapping：{{message}}',
      mappingSuccess: 'Mapping saved successfully',
    },
    error: {
      noProviders: 'No danmaku sources enabled, please enable in settings',
      noResultFound: 'No results found, try a different search term',
    },
  },
  selectorPage: {
    noAnimeFound: 'Nothing to select from',
    selectAnime: 'Multiple matches found for {{name}}, please select',
  },
  stylePage: {
    name: 'Danmaku Settings',
    limitPerSecond: 'Maximum Limit Per Second',
    disableLimit: 'Disable Limit',
    offset: 'Time Offset (milliseconds)',
    opacity: 'Opacity',
    'safeZone.y': 'Y-axis display range',
    'safeZone.x': 'X-axis display range',
    styles: 'Danmaku Styles',
    safeZones: 'Display Area',
    specialDanmaku: 'Special Danmaku',
    'specialDanmaku.showTop': 'Top Danmaku',
    'specialDanmaku.showBottom': 'Bottom Danmaku',
    maxOnScreen: 'Maximum Limit',
    allowOverlap: 'Allow Overlap',
    trackHeight: 'Track Height',
    size: 'Size',
    font: 'Font',
    speed: 'Speed',
    tooltip: {
      trackHeight: 'Higher values makes danmaku farther apart',
      allowOverlap:
        'Allow danmaku to overlap, does not affect top or bottom fixed danmaku',
      maxOnScreen:
        'The maximum number of danmaku that can be displayed on the screen at the same time.',
      offset:
        'How earlier danmaku appears. Positive values make danmaku appear later, negative values make danmaku appear earlier.',
      'safeZone.y': 'Y-axis (up and down) display range',
      'safeZone.x': 'X-axis (left and right) display range',
      specialDanmaku:
        'When off, danmaku will be shown as normal scrolling danmaku',
    },
    filtering: {
      name: 'Filter Settings',
      addFilterPattern: 'Add Filter Pattern',
      enterFilterPattern: 'Enter filter pattern, wrap with "/" for regex',
      testFilterPatterns: 'Test Filter Patterns',
      enterTestText: 'Enter test text',
      testResultExclude: 'This text will be filtered out',
      testResultInclude: 'This text will not be filtered out',
      patternList: 'Pattern List',
      validation: {
        patternEmpty: 'Pattern cannot be empty',
        duplicate: 'Pattern already exists',
        invalidRegex: 'Invalid regex',
      },
      tooltip: {
        noFilter: 'Filter is empty, add some patterns to test',
      },
    },
  },
  tabs: {
    config: 'Config',
    danmaku: 'Danmaku',
    mount: 'Mount',
    search: 'Search',
    selector: 'Selector',
    style: 'Danmaku Settings',
    import: 'Import Danmaku',
    integrationPolicy: 'Integration Policy',
  },
}

const translation = {
  ...common,
  ...domain,
  ...pages,
}

export default translation
