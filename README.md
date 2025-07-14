<div align="center">
  <img width="128" height="128" src="./assets/logo.png">
  <h1>
    Danmaku Anywhere
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
      <img alt="QQ群" src="https://img.shields.io/badge/QQ%E7%BE%A4-531237584-blue?logo=qq&style=flat-square">
    </p>
  </h1>
</div>


> 没有弹幕怎么看番？
> Danmaku Anywhere是一个开源项目，旨在为你喜爱的几乎任何视频网站添加弹幕。

此项目包含多个子项目

- [浏览器扩展 - 给几乎任何网站添加弹幕](#danmaku-anywhere-浏览器扩展)
- [Web应用 - 基于Kazumi规则的看番网站](#web应用)

## 🚀Danmaku Anywhere 浏览器扩展

### 功能特性

- **在几乎任何网站观看弹幕**：
    - 自托管的媒体服务器（如 Plex, Emby, Jellyfin）
    - 流媒体平台（如 YouTube, Crunchyroll）
    - 其他民间视频网站🏴‍☠️
- **纯浏览器体验**：无需任何桌面客户端
- **从多个弹幕源获取弹幕**，目前支持：
    - 弹弹Play
    - B站
    - 腾讯
- **手动导入**：支持手动导入本地弹幕文件 (`.xml` 格式)
- **自动匹配**：可自定义匹配规则，或使用AI匹配功能
- **弹幕导出**：可以方便地导出你观看过的弹幕

### 效果截图

<video src="https://github.com/user-attachments/assets/81703fe1-d04f-42cb-b9ed-35213c75f2e0"></video>

Plex

![Plex](./assets/screenshot_plex.png)

Jellyfin

![Jellyfin](./assets/screenshot_jellyfin.png)

YouTube

![YouTube](./assets/screenshot_youtube.png)

### 安装与使用

推荐通过官方商店一键安装：

- Chrome（Chromium内核浏览器）
    - [Chrome Web Store](https://chromewebstore.google.com/detail/danmaku-anywhere/jnflbkkmffognjjhibkjnomjedogmdpo?hl=zh)

- Firefox（含安卓）
    - [Firefox Add-ons](https://addons.mozilla.org/zh-CN/firefox/addon/danmaku-anywhere/)

手动安装及更详细的说明请看[说明文档](https://docs.danmaku.weeblify.app/getting-started/)

## 🧩Web应用

### 项目地址

[https://danmaku.weeblify.app/](https://danmaku.weeblify.app/)

**实验项目**，在浏览器中提供类似Kazumi的功能

- 基于Kazumi规则，在一个网站上观看来自多个网站的番剧视频
- 支持PWA
- **需要安装Danmaku Anywhere扩展后才可使用**

### 效果截图

![热门动画](assets/screenshot_webapp_trending.png)
![搜索](assets/screenshot_webapp_kazumi.png)

## 🧑‍💻参与开发

欢迎任何形式的贡献！如果您对项目开发感兴趣，请查阅[开发文档](https://docs.danmaku.weeblify.app/development/structure/)
