import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    starlight({
      title: 'Danmaku Anywhere',
      favicon: '/favicon.png',
      social: {
        github: 'https://github.com/Mr-Quin/danmaku-anywhere',
      },
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
          label: 'details',
          translations: {
            'zh-CN': '详细说明',
            en: 'Details',
          },
          items: [
            {
              label: 'install',
              translations: {
                'zh-CN': '安装说明',
                en: 'Installation',
              },
              link: '/details/install',
            },
            {
              label: 'mount-profile',
              translations: {
                'zh-CN': '装填配置',
                en: 'Mount Profile',
              },
              link: '/details/mount-profile',
            },
            {
              label: 'danmaku-source',
              translations: {
                'zh-CN': '弹幕来源',
                en: 'Danmaku Source',
              },
              link: '/details/danmaku-source',
            },
            {
              label: 'auto-mode',
              translations: {
                'zh-CN': '自动模式',
                en: 'Auto Mode',
              },
              link: '/details/auto-mode',
            },
            {
              label: 'limitations',
              translations: {
                'zh-CN': '工作原理',
                en: 'How it works',
              },
              link: '/details/limitations',
            }, // {
            //     label: 'faq',
            //     translations: {
            //         'zh-CN': '常见问题',
            //         en: 'FAQ'
            //     },
            //     link: '/details/faq',
            // },
          ],
        },
        {
          label: 'lingo',
          translations: {
            'zh-CN': '用语',
            en: 'Lingo',
          },
          link: '/lingo',
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
