export type ShortcutAction =
  | 'openSearch'
  | 'openSettings'
  | 'toggleFullscreen'
  | 'togglePlay'
  | 'seekBackward'
  | 'seekForward'
  | 'volumeUp'
  | 'volumeDown'
  | 'toggleMute'
  | 'previousEpisode'
  | 'nextEpisode'

export interface ShortcutDefinition {
  action: ShortcutAction
  keys: string[]
  label: string
}

export interface ShortcutGroup {
  label: string
  shortcuts: ShortcutDefinition[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: '播放器',
    shortcuts: [
      { action: 'toggleFullscreen', keys: ['F'], label: '切换全屏' },
      { action: 'togglePlay', keys: ['空格'], label: '播放 / 暂停' },
      { action: 'seekBackward', keys: ['←'], label: '后退 5 秒' },
      { action: 'seekForward', keys: ['→'], label: '前进 5 秒' },
      { action: 'volumeUp', keys: ['↑'], label: '音量 +10%' },
      { action: 'volumeDown', keys: ['↓'], label: '音量 -10%' },
      { action: 'toggleMute', keys: ['M'], label: '静音 / 取消静音' },
    ],
  },
  {
    label: '剧集',
    shortcuts: [
      { action: 'previousEpisode', keys: ['['], label: '上一集' },
      { action: 'nextEpisode', keys: [']'], label: '下一集' },
    ],
  },
  {
    label: '应用',
    shortcuts: [
      { action: 'openSearch', keys: ['Ctrl', 'K'], label: '打开搜索' },
      { action: 'openSearch', keys: ['/'], label: '打开搜索' },
      { action: 'openSettings', keys: ['?'], label: '打开设置' },
    ],
  },
]
