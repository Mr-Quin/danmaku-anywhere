<div align="center">
  <img width="128" height="128" src="./assets/logo.png">
  <h1>
    Danmaku Anywhere
  </h1>
</div>

> 没有弹幕怎么看番？
> Danmaku Anywhere是一个可以在任何视频网站上加载弹幕的浏览器插件

[中文] [English](./README.en.md)

## 功能

- 按动画搜索弹幕
- 将弹幕嵌入视频
- 自定义弹幕样式
- 本地弹幕缓存并导出为文件
- 自动根据视频匹配弹幕🚧

所有弹幕均来自 [弹弹 play](https://www.dandanplay.com/)

## 截图

![UI](./assets/ui_tour.gif)

Plex

![Plex](./assets/danmaku_plex.png)

Crunchyroll

![Crunchyroll](./assets/danmaku_crunchyroll.png)

## 安装

### Chrome

直接通过[商店](https://chromewebstore.google.com/detail/danmaku-anywhere/jnflbkkmffognjjhibkjnomjedogmdpo?authuser=1&hl=zh)
安装

#### 手动安装

商店发布的版本可能落后于最新版。需要最新版本的可以选择手动安装。

下载对应浏览器[最新发布的版本](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest)然后解压到任意文件夹

> [!IMPORTANT]
> 除非卸载扩展，请勿删除此文件夹

后续的更新直接解压到这个文件夹中并覆盖即可

1. 进入扩展页面[chrome://extensions/](chrome://extensions/)并启用开发者模式。
2. 点击 "加载未打包的扩展" 并选择已解压的扩展文件夹。

### Firefox

Firefox版本相比Chrome版本有更多的限制，并且由于部分API缺失，一些功能可能无法使用。

使用Firefox浏览器，从[这里](https://mr-quin.github.io/danmaku-anywhere/)下载并安装。

#### 手动安装

手动安装需使用开发者版本的Firefox。

安装详情见[这里](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
和[这里](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

## 使用指南

> [!NOTE]
> 文档并不完整，如果使用中遇到问题欢迎提出issue

此扩展程序提供两种模式：

- 手动模式： 手动搜索、装填和卸载各个剧集的弹幕。可用于任何网站。
- 自动模式： 自动匹配并装填弹幕，但是需要对每个网站进行适配（目前仅适用于 [Plex](https://www.plex.tv/)，包括自架版本）

### 1. 添加装填配置

装填配置决定在什么网站的什么位置加载弹幕

- 在扩展弹出窗口中，打开“装填配置”页
- 如果你的网站在预设配置中，点击预设配置，勾选”启用“并保存
- 如果你的网站不在预设列表中，点击“+”并填写：
    - URL模式（URL Patterns）： 网站的 URL
      格式（例如，`https://your.website.com/*`）使用[匹配模式](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)格式。如果你的网站使用`
      iframe`播放视频，此处应填写`iframe`的地址，通过查看`iframe`的`src`属性获得。
    - 视频选择器（Media Query）：选择视频播放器（通常为`video`
      ）使用[`querySelector`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)
      格式。一些视频网站比较特殊，例如页面中有多个`video`的情况需要填写更详细的`querySelector`。
    - 配置名称不可与其他配置重名，保存后不可更改，如果需要改名请删除配置再添加。

### 2. 搜索弹幕（手动模式）

手动模式下需要手动搜素弹幕，之后进行装填

- 在扩展弹出窗口中，打开“搜索番剧”页
- 填写番剧标题
- 集数建议留空
- 在返回的结果中展开需要的番剧，点击单个集数下载弹幕

> [!TIP]
> 如果返回结果为空，可能是因为番剧名称的汉化差异导致的。例如：搜“夜晚的水母不会游泳”没有结果，搜”夜之水母不会游泳“就有了。
> 可以多尝试几个名称，或者搜索日文原名，英文译名等

### 3. 装填弹幕（手动模式）

> [!NOTE]
> 在操作前，请确认能在页面上看到由此扩展注入的蓝色按钮。
> 如果看不到，请确认以为当前页面添加装填配置，并且配置以启用

- 在扩展弹出窗口中，打开“装填弹幕”页
- 在下拉菜单中选择剧集并点击“装填弹幕”将弹幕注入当前打开的标签页。
- 手动模式下,换集，换番剧等情况不会自动切换弹幕，需要重复以上步骤。
- 如果需要移除弹幕，点击“卸载弹幕”。

> [!TIP]
> 如果“装填弹幕”页提示不存在当前页面的装填配置但是你确定有的话，可以尝试：
>
> - 禁用再启用配置并刷新页面
> - 重启浏览器
> - 提交bug

### 自动模式

在自动模式下拓展会自动识别正在播放的番剧并匹配弹幕。如果自动模式出现问题，可以随时关闭自动模式进行手动装填。

自动模式需要对网站进行单独适配，目前仅支持Plex。如果希望适配某个网站欢迎提出issue。

以下为自动模式的一些注意事项：

#### Plex

把装填配置的名称设为“plex”以启用对Plex的适配。

- 拓展使用正在播放的媒体名称和集数来查找番剧，请确保媒体信息准确。推荐在媒体库中使用Plex Series和Plex Movie代理进行匹配。
- 拓展无法分辨正在播放的媒体是否为视频。如果正在播放的媒体不是视频（音乐，图片等），请先通过快捷按钮关闭弹幕或关闭自动模式。

### 弹幕样式

在扩展弹出窗口的“弹幕样式”页中设置

### 关闭插件/隐藏弹幕

- 全局开关：关闭弹幕相关的所有功能，在扩展弹出窗口右上角以及在右键菜单中开关
- “显示弹幕”开关：暂时隐藏弹幕，在扩展弹出窗口的“弹幕样式”页中
- 禁用装填配置：在装填配置的设置中取消勾选“启用”

## 开发

见[英文文档](./README.en.md#development)

## 猴油脚本（停止维护）

通过[这里](https://mr-quin.github.io/danmaku-anywhere/)安装

文档[plex-danmaku](./packages/plex-danmaku)
