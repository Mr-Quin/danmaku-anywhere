import {defineConfig} from 'astro/config';
import react from "@astrojs/react";

import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
    integrations: [react(), starlight({
        title: 'Danmaku Anywhere',
        social: {
            github: 'https://github.com/withastro/starlight',
        },
        // sidebar: [
        //     {
        //         label: 'Guides',
        //         items: [
        //             // Each item here is one entry in the navigation menu.
        //             {label: 'Example Guide', slug: 'guides/example'},
        //         ],
        //     },
        //     {
        //         label: 'Reference',
        //         autogenerate: {directory: 'reference'},
        //     },
        // ],
        // Set English as the default language for this site.
        defaultLocale: 'zh-cn',
        locales: {
            // English docs in `src/content/docs/en/`
            en: {
                label: 'English',
            },
            // Simplified Chinese docs in `src/content/docs/zh-cn/`
            'zh-cn': {
                label: '简体中文',
                lang: 'zh-CN',
            },
        },
    })]
});