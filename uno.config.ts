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
    colors: {
      page: '#F6F3EB',
      surface: '#FFFDF7',
      surfaceMuted: '#F0EFE6',
      ink: '#3F463D',
      inkMuted: '#737B6C',
      brand: '#74806B',
      brandStrong: '#596451',
      brandSoft: '#DFE6D7',
      line: '#DDE1D4',
      danger: '#A85F62',
      dangerSoft: '#F7E9E7',
      // 兼容现有管理页和演示页的旧语义名。
      primary: '#74806B',
      primaryStrong: '#596451',
      surfaceCard: '#FFFDF7',
      surfaceRow: '#F0EFE6',
      textBase: '#3F463D',
      textSoft: '#737B6C',
      positive: '#74806B',
      neutral: '#9B7A3C',
      negative: '#A85F62',
      muted: '#737B6C',
      subtle: '#949B8D',
    },

  },
  // 快捷键
  shortcuts: [
    [
      'flex-center',
      'flex items-center justify-center',
    ],
    ['app-page', 'min-h-screen bg-page text-ink'],
    ['app-surface', 'box-border border-2rpx border-line rounded-28rpx bg-surface'],
  ],
  rules: [
    [
      'app-gradient-page',
      {
        'min-height': '100vh',
        'background': 'linear-gradient(180deg, #f6f3eb 0%, #f8f5ee 42%, #f0efe6 100%)',
        'color': '#3f463d',
      },
    ],
    [
      'app-card',
      {
        'box-sizing': 'border-box',
        'padding': '28rpx',
        'border': '2rpx solid #dde1d4',
        'border-radius': '28rpx',
        'background': '#fffdf7',
        'box-shadow': '0 10rpx 28rpx rgba(63, 70, 61, 0.055)',
      },
    ],
    [
      'app-card-paper',
      {
        'box-sizing': 'border-box',
        'border': '2rpx solid #dde1d4',
        'border-radius': '34rpx',
        'background': 'linear-gradient(180deg, #fffdf7, #f8f5ee)',
        'box-shadow': '0 8rpx 22rpx rgba(63, 70, 61, 0.045)',
      },
    ],
    [
      'app-section-title',
      {
        'font-size': '30rpx',
        'line-height': '1.25',
        'font-weight': '700',
        'color': '#3f463d',
      },
    ],
    [
      'app-section-desc',
      {
        'font-size': '22rpx',
        'line-height': '1.6',
        'color': '#737b6c',
      },
    ],
    [
      /^app-(primary|secondary|ghost|danger)-btn$/,
      ([, type]) => {
        const style = {
          'min-height': '76rpx',
          'box-sizing': 'border-box',
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'gap': '10rpx',
          'border-radius': '999rpx',
          'font-size': '26rpx',
          'line-height': '1.2',
          'font-weight': '600',
          'transition': 'opacity 160ms ease, transform 160ms ease, background-color 160ms ease',
        }

        if (type === 'primary') {
          return {
            ...style,
            'color': '#fff',
            'background': '#74806b',
            'box-shadow': '0 10rpx 24rpx rgba(89, 100, 81, 0.18)',
          }
        }

        if (type === 'danger') {
          return {
            ...style,
            color: '#a85f62',
            background: '#f7e9e7',
            border: '2rpx solid rgba(168, 95, 98, 0.2)',
          }
        }

        if (type === 'ghost') {
          return {
            ...style,
            color: '#596451',
            background: 'transparent',
            border: '2rpx solid transparent',
            'box-shadow': 'none',
          }
        }

        return {
          ...style,
          color: '#596451',
          background: '#fffdf7',
          border: '2rpx solid #dde1d4',
        }
      },
    ],
    [/^app-control-(disabled|pressed)$/, ([, state]) => state === 'disabled'
      ? { opacity: '0.42', 'pointer-events': 'none' }
      : { opacity: '0.82', transform: 'scale(0.98)' }],
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
