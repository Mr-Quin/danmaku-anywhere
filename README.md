<div align="center">
  <img width="128" height="128" src="./assets/logo.png">
  <h1>
    Danmaku Anywhere
  </h1>
</div>

> 没有弹幕怎么看番？
> Danmaku Anywhere 是一个可以在任何视频网站上加载弹幕的浏览器插件

[中文] [English](./README.en.md)

## 功能 🚧

- 按动画搜索弹幕
- 将弹幕嵌入视频
- 自定义弹幕样式
- 本地弹幕缓存并导出为文件

所有弹幕均来自 [弹弹 play](https://www.dandanplay.com/)

## 安装

正在尝试上架Chrome Web Store，在上架之前需手动安装

下载[最新发布的版本](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest)

### Chrome

1. 进入扩展页面 [chrome://extensions/](chrome://extensions/) 并启用开发者模式。
2. 点击 "加载未打包的扩展" 并选择已解压的扩展文件夹。

## 使用指南

本扩展程序提供两种模式：

- 手动模式： 可用于任何网站，需要手动搜索、挂载和卸载各个节目和剧集的弹幕。
- 自动模式： 适用于选定网站（目前仅适用于 [Plex](https://www.plex.tv/)，包括自架版本），可以自动匹配并挂载弹幕

## 快速上手

### 1. 添加挂载配置

这将告诉扩展程序在哪里加载弹幕：

- 在扩展程序弹出窗口中，打开“Config”页
- 启用预设配置
- 如果你的网站不在预设列表中，点击“+”并提供：
  - 匹配模式： 网站的 URL 格式（例如，`https://your.website.com/*`）使用[匹配模式](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)格式
  - 视频选择器：选择视频播放器（通常为`video`）使用[`querySelector`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)格式

> [!IMPORTANT]
> 启用配置时会请求网站权限，不授予将无法使用。（稍后可以在“Options”页面中撤销权限，或通过删除配置来撤销权限。）

### 2. 搜索和挂载弹幕（手动模式或临时使用）

> [!TIP]
> 自动模式无需这些操作

- 在“Search”页中按标题查找动画。
- 点击剧集以下载/更新弹幕。
- 在下拉菜单中选择剧集并点击“Mount”以显示弹幕。
- 点击“Unmount”以移除弹幕。

### 关闭插件/隐藏弹幕

- 全局“启用”开关：关闭弹幕相关的所用功能，可以在右键菜单中开关
- “显示弹幕”开关（Styles）： 暂时隐藏弹幕
- 禁用挂载配置（Mount Config）： 单独页面的开关，需要刷新页面才能生效

## 截图

Plex

![Plex](./assets/danmaku_plex.png)

Crunchyroll

![Crunchyroll](./assets/danmaku_crunchyroll.png)

UI

![Search page](./assets/danmaku_search_page.png)
![Options page](./assets/danmaku_options_page.png)
![Floating panel](./assets/danmaku_floating_dialogue.png)

## 开发

见[英文文档](./README.en.md#development)

## 猴油脚本 （以停止维护）

[plex-danmaku](./packages/plex-danmaku)
