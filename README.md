<div align="center">
  <img width="128" height="128" src="./assets/logo.png">
  <h1>
    弹幕任何地方
  </h1>
  <p><em>Danmaku Anywhere</em></p>
  <p align="center">
    <a href="https://github.com/Mr-Quin/danmaku-anywhere/releases">
      <img alt="GitHub Release" src="https://img.shields.io/github/v/release/Mr-Quin/danmaku-anywhere?style=flat-square&logo=github">
    </a>
    <a href="https://github.com/Mr-Quin/danmaku-anywhere/actions">
      <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/Mr-Quin/danmaku-anywhere/release.yml?style=flat-square&logo=github">
    </a>
    <a href="https://chromewebstore.google.com/detail/danmaku-anywhere/jnflbkkmffognjjhibkjnomjedogmdpo?hl=zh">
      <img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/jnflbkkmffognjjhibkjnomjedogmdpo?style=flat-square&logo=googlechrome&logoColor=yellow">
    </a>    
    <a href="https://addons.mozilla.org/zh-CN/firefox/addon/danmaku-anywhere/">
      <img alt="Chrome Web Store Rating" src="https://img.shields.io/amo/rating/danmaku-anywhere?style=flat-square&logo=firefox&logoColor=orange">
    </a>
    <img alt="QQ群" src="https://img.shields.io/badge/QQ%E7%BE%A4-531237584-blue?logo=qq&style=flat-square">
  </p>
</div>

> 没有弹幕怎么看番？
> **弹幕任何地方**是一个开源项目，旨在为你喜爱的几乎任何视频网站添加弹幕。

此项目包含多个子项目：

- [浏览器扩展 - 给几乎任何网站添加弹幕](#extension)
- [Web 应用 - 基于 Kazumi 规则的视频采集网站](#app)

## 目录

- [快速开始](#quick-start)
- [下载安装](#installation)
- [功能特性](#extension)
- [开发计划](#roadmap)
- [Web 应用](#app)
- [参与开发](#contributing)
- [许可证](#license)

<a id="quick-start"></a>

## ⚡ 快速开始

1. 安装扩展（见下文）。
2. 打开视频网站（如 Plex）。
3. 右键网站空白处，选择“为当前网站添加配置”
4. 点击网站左下角的扩展图标，让它自动匹配或搜索弹幕。

请参阅 [说明文档](https://docs.danmaku.weeblify.app/getting-started/) 了解更多详情。

<a id="installation"></a>

## 📥 下载安装

### 桌面端

| 浏览器                    | 安装方式                                                                                                                                                                                                                           |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chrome / Edge / Opera** | [Chrome 商店](https://chromewebstore.google.com/detail/danmaku-anywhere/jnflbkkmffognjjhibkjnomjedogmdpo?hl=zh) / [Edge 商店](https://microsoftedge.microsoft.com/addons/detail/danmaku-anywhere/alcoddhlgdbhlljlnhckhomdcgbnmanf) |
| **Firefox**               | [Firefox Add-ons](https://addons.mozilla.org/zh-CN/firefox/addon/danmaku-anywhere/)                                                                                                                                                |
| **Safari**                | 不支持                                                                                                                                                                                                                             |

### 移动端

| 系统        | 浏览器                     | 安装方式                                                                                                                                        |
| :---------- | :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android** | Kiwi / Lemur / Edge Canary | [下载 .crx/.zip](https://docs.danmaku.weeblify.app/downloads/) 或 [GitHub Release](https://github.com/Mr-Quin/danmaku-anywhere/releases/latest) |
| **iOS**     | Safari / Chrome            | **不支持** (受限于 🍎)                                                                                                                          |

> **预览版**: 想要尝鲜未发布的最新版本，可以在 [下载页面](https://docs.danmaku.weeblify.app/downloads/) 或 [GitHub Release](https://github.com/Mr-Quin/danmaku-anywhere/releases) 下载安装预览版 (pre-release)。

<a id="extension"></a>

## 🚀 浏览器扩展: 功能特性

- **在几乎任何网站观看弹幕**：
  - 自托管的媒体服务器（如 Plex、Emby、Jellyfin、飞牛影视）
  - 流媒体平台（如 YouTube、Crunchyroll）
  - 其他视频网站
- **纯浏览器体验**：无需任何桌面客户端
- **从多个弹幕源获取弹幕**，目前支持：
  - 弹弹 Play
  - B 站
  - 腾讯
  - MacCMS (Vod)
  - 兼容弹弹 Play API 的服务，如[danmu-api](https://github.com/huangxd-/danmu_api)
- **手动导入**：支持手动导入本地弹幕文件 (`.xml` 格式)
- **自动匹配**：可自定义匹配规则，或使用 AI 匹配功能
  - 根据播放的视频，自动搜索弹幕
  - 自动关联同名的本地弹幕文件
- **弹幕导出**：将看过的弹幕导出为`.xml`文件

### 效果截图

<video src="https://github.com/user-attachments/assets/c5df8221-4381-4d58-9f88-3ca73a1431bb"></video>

<details>
<summary>点击展开截图</summary>

**Plex**

![Plex](./assets/screenshot_plex.png)

**Jellyfin**

![Jellyfin](./assets/screenshot_jellyfin.png)

**YouTube**

![YouTube](./assets/screenshot_youtube.png)

</details>

<br/>

<a id="roadmap"></a>

## 🗺️ 开发计划

项目的待办事项请参考 [项目看板](https://sharing.clickup.com/90131020449/b/h/6-901309979467-2/ce1456a4915dc70)

近期重点：

- 支持本地 AI
- 智能防挡弹幕
- 一起看

<a id="app"></a>

## 🧩 Web 应用

> [https://danmaku.weeblify.app/](https://danmaku.weeblify.app/)

这是一个**实验性项目**，旨在在浏览器中提供类似 Kazumi 的功能。**需要安装*弹幕任何地方*扩展后才可使用**。

- 基于 Kazumi 规则，在一个网站上观看来自不同网站的视频
- 播放本地视频
- 支持 PWA

### 效果截图

![热门动画](assets/screenshot_webapp_trending.png)
![搜索](assets/screenshot_webapp_kazumi.png)

<a id="contributing"></a>

## 🧑‍💻 参与开发

欢迎任何形式的贡献！包括但不限于 代码、美术资源、文档。

如果您对项目开发感兴趣，请查阅 [开发文档](https://docs.danmaku.weeblify.app/development/structure/)。

<a id="credits"></a>

## ❤️ 美术资源

### 吳都行

### 猫与白月（[B 站](https://space.bilibili.com/220694183)）

<a id="license"></a>

## 📝 许可证

本项目的每个包都有自己的许可证。基本上，除了 **danmaku-anywhere** 扩展为 AGPL，其他包都是 MIT 许可证。

详情请查看 [许可证](LICENSE)。
