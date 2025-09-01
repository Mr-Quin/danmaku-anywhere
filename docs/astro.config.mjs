import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://danmaku.weeblify.app',

  integrations: [
    react(),
    starlight({
      title: {
        en: 'Danmaku Anywhere',
        'zh-CN': '弹幕任何地方',
      },
      customCss: ['./src/tailwind.css'],
      favicon: '/favicon.png',
      logo: {
        light: './src/assets/logo-circle.png',
        dark: './src/assets/logo-circle.png',
      },
      lastUpdated: false,
      editLink: {
        baseUrl:
          'https://github.com/Mr-Quin/danmaku-anywhere/edit/master/docs/',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Mr-Quin/danmaku-anywhere',
        },
      ],
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
          ],
        },
        {
          label: 'integration-policy',
          translations: {
            'zh-CN': '适配规则',
            en: 'Integration Policy',
          },
          items: [
            {
              label: 'overview',
              translations: {
                'zh-CN': '概览',
                en: 'Overview',
              },
              link: '/integration-policy/overview',
            },
            {
              label: 'ai',
              translations: {
                'zh-CN': 'AI自动适配',
                en: 'AI',
              },
              link: '/integration-policy/ai',
            },
            {
              label: 'xpath',
              translations: {
                'zh-CN': 'XPath规则',
                en: 'XPath Policy',
              },
              link: '/integration-policy/xpath',
            },
          ],
        },
        {
          label: 'development',
          translations: {
            'zh-CN': '开发',
            en: 'Development',
          },
          items: [
            {
              label: 'structure',
              translations: {
                'zh-CN': '项目结构',
                en: 'Project Structure',
              },
              link: '/development/structure',
            },
            {
              label: 'limitations',
              translations: {
                'zh-CN': '技术细节',
                en: 'Implementation Details',
              },
              link: '/development/limitations',
            },
          ],
        },
        {
          label: 'change-log',
          translations: { 'zh-CN': '更新日志', en: 'Change Log' },
          link: '/change-log',
        },
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
  vite: {
    plugins: [tailwindcss()],
  },
})
