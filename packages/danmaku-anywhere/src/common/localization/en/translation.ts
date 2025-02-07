const common = {
  common: {
    add: 'Add',
    apiEndpoint: 'API Endpoint',
    apply: 'Apply',
    cancel: 'Cancel',
    confirmDeleteMessage: 'Are you sure you want to delete "{{name}}"?',
    confirmDeleteTitle: 'Confirm delete',
    copyToClipboard: 'Copy to Clipboard',
    copy: 'copy',
    delete: 'Delete',
    enable: 'Enable',
    export: 'Export',
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
      exported: 'Danmaku Exported',
      exportError: 'Failed to export danmaku: {{message}}',
      mounted: 'Danmaku Mounted: {{name}} ({{count}})',
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
      nextEpisodeNotFound: 'Next episode not found',
    },
    tooltip: {
      nextEpisode: 'Only available in manual mode',
    },
    mount: 'Mount',
    export: 'Export',
    noComments: 'No comments',
    refresh: 'Refresh Danmaku',
    nextEpisode: 'Next Episode',
    style: 'Style',
    type: {
      Custom: 'Custom',
      DanDanPlay: 'DanDanPlay',
      Bilibili: 'Bilibili',
      Tencent: 'Tencent',
      Iqiyi: 'Iqiyi',
    },
    unmount: 'Unmount',
  },
  integration: {
    name: 'Integration',
    alert: {
      usingIntegration: 'Using Integration: {{name}}',
      titleMapping:
        'Mapped title found for {{originalTitle}} -> {{mappedTitle}}',
      titleMappingError: 'Failed to get title mapping for {{title}}, skipping',
      search: 'Searching for anime: {{title}}',
      searchError: 'Failed to search for anime: {{message}}',
      searchResultEmpty: 'No anime found for {{title}}',
      openSearch: 'Open search page',
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
      pattern: 'Pattern',
      'pattern.add': 'Add Pattern',
      title: {
        create: 'Add Config',
        edit: 'Edit {{name}}',
      },
      urlPatterns: 'URL Patterns',
    },
    name: 'Configs',
  },
  integrationPolicyPage: {
    name: 'Integration Policy',
    noIntegration: 'No integration policy available for this page',
    hasIntegration: 'Using Integration: "{{name}}"',
    create: 'Add Integration Policy',
    edit: 'Edit {{name}}',
    parseComplete: 'Parse Complete',
    nodesFound: 'Nodes Found',
    integrationActive: 'Active',
    integrationInactive: 'Inactive',
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
      helper: {
        titleOnly:
          "If checked, only the title node will be used to match the show. Useful if all information is contained in the title, e.g. if the title is the file name. Uncheck if the show's information is spread across different nodes.",
        testDisabled: 'Can only be used on pages with a Mount Config',
      },
    },
  },
  danmakuPage: {
    animeList: 'Anime List',
    noAnime: 'No anime available',
    noResult: "No anime found with title '{{filter}}'",
    deleteAll: 'Delete all Danmaku',
    confirmDeleteMessage: 'Are you sure to delete all Danmaku?',
    upload: {
      confirm: 'Confirm Import',
      dialogTitle: 'Import Danmaku',
      parsedEntries: 'Episodes found: ',
      parseError_one: 'Failed to parse {{count}} Danmaku file',
      parseError_other: 'Failed to parse {{count}} Danmaku files',
      selectFiles: 'Select Danmaku Files',
      importCustom: 'Import Custom Danmaku',
      importExported: 'Import Danmaku',
      exportAll: 'Export All Danmaku',
      exportAnime: 'Export All Episodes',
      success: 'Import successful',
      upload: 'Import Danmaku',
      alert: {
        parseError: 'Failed to parse files',
      },
      help: {
        selectFiles:
          "Select Danmaku files to import, or drag and drop files here. File name will be used as the show's name. Supported formats: JSON, XML",
        importCustom:
          'Use this to import custom danmaku. Refer to the documentation for custom danmaku format',
        importExported:
          'Use this to import danmaku that was previously exported. If the imported danmaku overlaps with existing danmaku, the existing danmaku will be overwritten',
      },
    },
  },
  mountPage: {
    addMountConfig: 'Add a mount configuration to enable the controller',
    instructions:
      'Select an episode and click Mount to inject it into the current tab.',
    noActiveTab: 'No active tab',
    noDanmaku: 'No danmaku found',
    noDanmakuHelp: 'Search and danmaku to enable the controller',
    pageTitle: 'Mount Controller',
    unavailable:
      'The current page does not have a mount configuration, or the configuration is disabled, or is not configured correctly.',
    unavailableTips:
      'If this happens after updating the extension, try restarting the browser.',
    unsupported: 'Chrome internal pages are not supported',
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
      dandanplay: {
        useProxy: 'Use new API',
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
        loadNextEpisodeComments: 'Load Next Episode Comments',
        refreshComments: 'Refresh Comments',
        unmountComments: 'Unmount Comments',
        togglePip: 'Enter Picture-in-Picture (Experimental)',
      },
    },
    pages: {
      danmakuSource: 'Danmaku Source',
      theme: 'UI Theme',
      hotkeys: 'Hotkeys',
      retentionPolicy: 'Retention Policy',
      advanced: 'Advanced',
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
    saveMapping: 'Remember selection',
    title: 'Title',
    convertedTitle: 'Converted Title',
    error: {
      noProviders: 'No danmaku sources enabled, please enable in settings',
      noResultFound: 'No results found, try a different search term',
    },
  },
  selectorPage: {
    noAnimeFound: 'Nothing to select from',
    saveMapping: 'Remember selection',
    saveMappingAs: 'Remember {{originalName}} as {{newName}}',
    selectAnime: 'Multiple matches found for {{name}}, please select',
  },
  stylePage: {
    name: 'Danmaku Settings',
    limitPerSecond: 'Maximum Limit Per Second',
    disableLimit: 'Disable Limit',
    offset: 'Time Offset (milliseconds)',
    opacity: 'Opacity',
    'safeZone.bottom': 'Bottom',
    'safeZone.top': 'Top',
    safeZones: 'Safe Zones',
    size: 'Size',
    speed: 'Speed',
    tooltip: {
      limitPerSecond:
        'No more than this value of danmaku will be added per second. If playback lags due to too many danmaku, try lowering this value. "0" means no danmaku will be shown,"Disable Limit" means all danmaku will be shown.',
      offset:
        'How earlier danmaku appears. Positive values make danmaku appear later, negative values make danmaku appear earlier.',
      opacity: '"0" means transparent, "1" means opaque',
      'safeZone.bottom':
        'The percentage of the bottom of the video that will not contain danmaku',
      'safeZone.top':
        'The percentage of the top of the video that will not contain danmaku',
      size: 'Font size of danmaku.',
      speed:
        'How fast danmaku flies across the screen. "1" being the slowest, "5" being the fastest.',
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
    integrationPolicy: 'Integration Policy',
  },
}

const translation = {
  ...common,
  ...domain,
  ...pages,
}

export default translation
