import { presetUni } from '@uni-helper/unocss-preset-uni'
import { createRequire } from 'node:module'
import {
  defineConfig,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

// 配置在 Node 中执行，用 CommonJS 读取 JSON，避免 ESM 导入缺少 type: json。
const carbonIcons = createRequire(import.meta.url)('@iconify-json/carbon/icons.json')

export default defineConfig({
  presets: [
    presetUni({
      attributify: false,
    }),
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
      // 显式注册已安装的图标集，避免小程序工具栏依赖运行时自动查找。
      collections: { carbon: () => carbonIcons },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  content: {
    pipeline: {
      include: [
        // 默认会扫 vue / nvue，这里显式补上 ts/js
        /\.(vue|nvue|ts|tsx|js|jsx)$/,
      ],
      // 你也可以排除 d.ts / 构建产物
      exclude: [
        /node_modules/,
        /\.d\.ts$/,
        /dist/,
        /unpackage/,
      ],
    },
  },
  // 主题设置

  theme: {
    // 颜色：用“语义 token”，别在业务里裸写 #xxxxxx
    colors: {
      primary: '#0B5CAB',
      primaryStrong: '#0A477F',
      surface: '#F2F7FD',
      surfaceCard: '#FFFFFF',
      surfaceRow: '#F1F5F9',
      textBase: '#0F172A',
      textSoft: '#425466',
      positive: '#0B5CAB',
      neutral: '#A98A35',
      negative: '#C24157',
      muted: '#64748B',
      subtle: '#94A3B8',
    },

  },
  // 快捷键
  shortcuts: [
    [
      'flex-center',
      'flex items-center justify-center',
    ],
  ],
  rules: [
    [
      'app-gradient-page',
      {
        'min-height': '100vh',
        'background': 'linear-gradient(180deg, #e3eaf3 0%, #edf4fb 28%, #f2f7fd 100%)',
        'color': '#0f172a',
      },
    ],
    [
      'app-card',
      {
        'box-sizing': 'border-box',
        'padding': '28rpx',
        'border': '2rpx solid rgba(148, 163, 184, 0.28)',
        'border-radius': '28rpx',
        'background': '#fff',
        'box-shadow': '0 12rpx 30rpx rgba(15, 23, 42, 0.055)',
      },
    ],
    [
      'app-card-paper',
      {
        'box-sizing': 'border-box',
        'border': '2rpx solid rgba(148, 163, 184, 0.28)',
        'border-radius': '34rpx',
        'background': 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96)), #fff',
        'box-shadow': '0 8rpx 22rpx rgba(15, 23, 42, 0.045)',
      },
    ],
    [
      'app-section-title',
      {
        'font-size': '30rpx',
        'line-height': '1.25',
        'font-weight': '700',
        'color': '#0f172a',
      },
    ],
    [
      'app-section-desc',
      {
        'font-size': '22rpx',
        'line-height': '1.6',
        'color': '#64748b',
      },
    ],
    [
      /^app-(primary|secondary|danger)-btn$/,
      ([, type]) => {
        const style = {
          'min-height': '84rpx',
          'box-sizing': 'border-box',
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': '10rpx',
          'border-radius': '999rpx',
          'font-size': '26rpx',
          'line-height': '1.2',
          'font-weight': '700',
        }

        if (type === 'primary') {
          return {
            ...style,
            'color': '#fff',
            'background': '#0b5cab',
            'box-shadow': '0 10rpx 24rpx rgba(11, 92, 171, 0.18)',
          }
        }

        if (type === 'danger') {
          return {
            ...style,
            color: '#c24157',
            background: '#fff1f2',
            border: '2rpx solid rgba(194, 65, 87, 0.18)',
          }
        }

        return {
          ...style,
          color: '#425466',
          background: '#f1f5f9',
          border: '2rpx solid rgba(148, 163, 184, 0.28)',
        }
      },
    ],
    [
      'p-safe',
      {
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      },
    ],
    ['pt-safe', { 'padding-top': 'env(safe-area-inset-top)' }],
    ['pb-safe', { 'padding-bottom': 'env(safe-area-inset-bottom)' }],
  ],
})
