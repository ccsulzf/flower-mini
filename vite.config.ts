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
import { excludeMaterialAdmin, materialAdminEnabled } from './scripts/material-admin-config.cjs'

const basePageExclude = [
  '**/components/**',
  '**/ui/**',
  '**/partials/**',
]

const productionPageExclude = [
  '**/debug*.vue',
  '**/test*.vue',
]

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const includeMaterialAdmin = materialAdminEnabled(command, mode, process.env.UNI_NODE_ENV || process.env.NODE_ENV)
  const pageExclude = mode === 'production'
    ? [...basePageExclude, ...productionPageExclude]
    : basePageExclude

  return {
    define: { __MATERIAL_ADMIN__: JSON.stringify(includeMaterialAdmin) },
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
        subPackages: includeMaterialAdmin ? ['src/subpackages/material-admin'] : [],
        mergePages: true,
        onBeforeWriteFile: includeMaterialAdmin ? undefined : excludeMaterialAdmin,
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
