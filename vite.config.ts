import path from 'node:path'

import Uni from '@uni-helper/plugin-uni'
import UniHelperComponents from '@uni-helper/vite-plugin-uni-components'
import UniHelperLayouts from '@uni-helper/vite-plugin-uni-layouts'
import UniHelperManifest from '@uni-helper/vite-plugin-uni-manifest'
import UniHelperPages from '@uni-helper/vite-plugin-uni-pages'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import UniPolyfill from 'vite-plugin-uni-polyfill'

const basePageExclude = [
  '**/components/**',
  '**/ui/**',
  '**/partials/**',
]

const productionPageExclude = [
  '**/debug*.vue',
  '**/demo*.vue',
  '**/test*.vue',
]

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const pageExclude = mode === 'production'
    ? [...basePageExclude, ...productionPageExclude]
    : basePageExclude

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;',
        },
      },
    },
    esbuild: {
      target: 'es2015',
    },
    build: {
      target: 'es2015',
    },
    plugins: [
      // https://uni-helper.js.org/vite-plugin-uni-manifest
      UniHelperManifest(),
      // https://uni-helper.js.org/vite-plugin-uni-pages
      UniHelperPages({
        dir: 'src/pages', // 👈 明确主包
        dts: 'src/uni-pages.d.ts',
        // 避免把页面内的子组件当成页面打包
        exclude: pageExclude,
      }),
      // https://uni-helper.js.org/vite-plugin-uni-layouts
      UniHelperLayouts(),
      // https://uni-helper.js.org/vite-plugin-uni-components
      UniHelperComponents({
        dts: 'src/components.d.ts',
        directoryAsNamespace: false,
        collapseSamePrefixes: true,
      }),
      // https://uni-helper.js.org/plugin-uni
      Uni(),
      UniPolyfill(),
      // https://github.com/antfu/unplugin-auto-import
      AutoImport({
        imports: ['vue', '@vueuse/core', 'uni-app'],
        dts: 'src/auto-imports.d.ts',
        dirs: ['src/composables', 'src/stores', 'src/utils'],
        vueTemplate: true,
      }),
      // https://github.com/antfu/unocss
      // see unocss.config.ts for config
      UnoCSS(),
    ],
  }
})
