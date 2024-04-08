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

正在尝试上架Chrome Web Store，在上架之前需手动安装

下载[最新发布的版本](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest)然后解压到任意文件夹

> [!IMPORTANT]
> 除非卸载扩展，请勿删除此文件夹

后续的更新直接解压到这个文件夹中并覆盖即可

### Chrome

1. 进入扩展页面[chrome://extensions/](chrome://extensions/)并启用开发者模式。
2. 点击 "加载未打包的扩展" 并选择已解压的扩展文件夹。

### Firefox

没有在Firefox上测试过所以不知道能不能用，但是后续计划支持Firefox

## 使用指南

> [!NOTE]
> 文档并不完整，如果使用中遇到问题欢迎提出issue

此扩展程序提供两种模式：

- 手动模式： 手动搜索、挂载和卸载各个剧集的弹幕。可用于任何网站。
- 自动模式： 自动匹配并挂载弹幕，但是需要对每个网站进行适配（目前仅适用于 [Plex](https://www.plex.tv/)，包括自架版本）

### 1. 添加挂载配置

挂载配置决定在什么网站的什么位置加载弹幕

> [!IMPORTANT]
> 启用配置时会请求网站权限，不授予将无法使用。（稍后可以在“Options”页面中撤销权限，或通过删除配置来撤销权限。）

- 在扩展弹出窗口中，打开“Config”页
- 如果你的网站在预设配置中，点击预设配置，勾选启用（Enabled）并保存
- 如果你的网站不在预设列表中，点击“+”并填写：
  - 匹配模式（URL Patterns）： 网站的 URL 格式（例如，`https://your.website.com/*`）使用[匹配模式](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)格式。如果你的网站使用`iframe`播放视频，此处应填写`iframe`的地址，通过查看`iframe`的`src`属性获得。
  - 视频选择器（Media Query）：选择视频播放器（通常为`video`）使用[`querySelector`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)格式。一些视频网站比较特殊，例如页面中有多个`video`的情况需要填写更详细的`querySelector`。
  - 配置名称（Name）：自定义名称，不可与其他配置重名，保存后不可更改，如果需要改名请删除配置再添加。

### 2. 搜索弹幕（手动模式）

手动模式下需要手动搜素弹幕，之后进行挂载

- 在扩展弹出窗口中，打开“Search”页
- 填写番剧名称（Title）
- 集数（Episode）建议留空
- 在返回的结果中展开需要的番剧，点击单个集数下载弹幕

> [!TIP]
> 如果返回结果为空，可能是因为番剧名称的汉化差异导致的。例如：搜“夜晚的水母不会游泳”没有结果，搜”夜之水母不会游泳“就有了。
> 可以多尝试几个名称，或者搜索日文原名，英文译名等

### 3. 挂载弹幕（手动模式）

> [!NOTE]
> 在操作前，请确认能在页面上看到由此扩展注入的蓝色按钮。
> 如果看不到，请确认以为当前页面添加挂载配置，并且配置以启用

- 在扩展弹出窗口中，打开“Mount”页
- 在下拉菜单中选择剧集并点击“Mount”挂载弹幕。
- 手动模式下,换集，换番剧等情况不会自动切换弹幕，需要重复以上步骤。
- 如果需要移除弹幕，点击“Unmount”。

> [!TIP]
> 如果“Mount”页提示不存在当前页面的挂载配置但是你确定有的话，可以尝试：
>
> - 禁用再启用配置并刷新页面
> - 重启浏览器
> - 提交bug

### 弹幕样式

在扩展弹出窗口的“Style”页中设置

### 关闭插件/隐藏弹幕

- 全局开关：关闭弹幕相关的所有功能，在扩展弹出窗口右上角以及在右键菜单中开关
- “显示弹幕”开关：暂时隐藏弹幕，在扩展弹出窗口的“Style”页中
- 禁用挂载配置：在挂载配置的设置中取消勾选Enable

## 开发

见[英文文档](./README.en.md#development)

## 猴油脚本（停止维护）

[plex-danmaku](./packages/plex-danmaku)
