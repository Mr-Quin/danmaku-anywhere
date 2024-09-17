import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://danmaku.weeblify.app',
  integrations: [
    react(),
    starlight({
      title: 'Danmaku Anywhere',
      favicon: '/favicon.png',
      logo: {
        light: './src/assets/logo.png',
        dark: './src/assets/logo.png',
      },
      lastUpdated: false,
      editLink: {
        baseUrl: 'https://github.com/Mr-Quin/danmaku-anywhere/edit/main/docs/',
      },
      social: {
        github: 'https://github.com/Mr-Quin/danmaku-anywhere',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'getting-started',
          translations: {
            'zh-CN': '快速上手',
            en: 'Getting Started',
          },
          link: '/getting-started',
        },
        {
          label: 'docs',
          translations: {
            'zh-CN': '文档',
            en: 'Docs',
          },
          items: [
            {
              label: 'install',
              translations: {
                'zh-CN': '安装说明',
                en: 'Installation',
              },
              link: '/docs/install',
            },
            {
              label: 'mount-profile',
              translations: {
                'zh-CN': '装填配置',
                en: 'Mount Profile',
              },
              link: '/docs/mount-profile',
            },
            {
              label: 'danmaku',
              translations: {
                'zh-CN': '弹幕管理',
                en: 'Danmaku Management',
              },
              link: '/docs/danmaku',
            },
            {
              label: 'integration-policy',
              translations: {
                'zh-CN': '适配配置',
                en: 'Integration Policy',
              },
              link: '/docs/integration-policy',
            },
            {
              label: 'limitations',
              translations: {
                'zh-CN': '工作原理',
                en: 'How it works',
              },
              link: '/docs/limitations',
            },
          ],
        },
        // {
        //   label: 'lingo',
        //   translations: {
        //     'zh-CN': '用语',
        //     en: 'Lingo',
        //   },
        //   link: '/lingo',
        // },
        {
          label: 'plex-danmaku',
          translations: {
            'zh-CN': 'Plex Danmaku',
            en: 'Plex Danmaku',
          },
          link: '/plex-danmaku',
        },
      ],
      defaultLocale: 'root',
      locales: {
        en: {
          label: 'English',
          lang: 'en',
        },
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
    }),
  ],
})
