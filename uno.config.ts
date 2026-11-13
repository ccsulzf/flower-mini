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

// 界面配色的唯一来源；花材、画布和作品数据不使用这套主题。
export const appColors = {
  page: '#F5FBF8',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF5EF',
  ink: '#40534C',
  inkMuted: '#667A71',
  subtle: '#82958C',
  brand: '#4F806C',
  brandStrong: '#3E6958',
  brandSoft: '#DFF2E8',
  sage: '#64846E',
  sageSoft: '#EBF5EC',
  line: '#DCEAE2',
  danger: '#AC5D60',
  dangerSoft: '#FCEBED',
  neutral: '#8B7166',
  neutralSoft: '#F8EEE8',
}

const appVariables = Object.fromEntries(
  Object.entries(appColors).flatMap(([name, value]) => {
    const rgb = [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16)).join(', ')
    return [[`--app-${name}`, value], [`--app-${name}-rgb`, rgb]]
  }),
)

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
  preflights: [{ getCSS: () => `page { ${Object.entries(appVariables).map(([name, value]) => `${name}: ${value};`).join(' ')} }` }],
  // 主题设置

  theme: {
    colors: {
      ...appColors,
      primary: appColors.brand,
      primaryStrong: appColors.brandStrong,
      surfaceCard: appColors.surface,
      surfaceRow: appColors.surfaceMuted,
      textBase: appColors.ink,
      textSoft: appColors.inkMuted,
      positive: appColors.sage,
      neutral: appColors.neutral,
      negative: appColors.danger,
      muted: appColors.inkMuted,
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
        'background': 'linear-gradient(180deg, var(--app-surfaceMuted) 0%, var(--app-page) 42%, var(--app-surfaceMuted) 100%)',
        'color': 'var(--app-ink)',
      },
    ],
    [
      'app-card',
      {
        'box-sizing': 'border-box',
        'padding': '28rpx',
        'border': '2rpx solid var(--app-sageSoft)',
        'border-radius': '28rpx',
        'background': 'var(--app-page)',
        'box-shadow': '0 10rpx 28rpx rgba(var(--app-ink-rgb), 0.055)',
      },
    ],
    [
      'app-card-paper',
      {
        'box-sizing': 'border-box',
        'border': '2rpx solid var(--app-sageSoft)',
        'border-radius': '34rpx',
        'background': 'linear-gradient(180deg, var(--app-page), var(--app-page))',
        'box-shadow': '0 8rpx 22rpx rgba(var(--app-ink-rgb), 0.045)',
      },
    ],
    [
      'app-section-title',
      {
        'font-size': '30rpx',
        'line-height': '1.25',
        'font-weight': '700',
        'color': 'var(--app-ink)',
      },
    ],
    [
      'app-section-desc',
      {
        'font-size': '22rpx',
        'line-height': '1.6',
        'color': 'var(--app-brandStrong)',
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
            'color': 'var(--app-surface)',
            'background': 'var(--app-brand)',
            'box-shadow': '0 10rpx 24rpx rgba(var(--app-brand-rgb), 0.18)',
          }
        }

        if (type === 'danger') {
          return {
            ...style,
            color: 'var(--app-danger)',
            background: 'var(--app-surfaceMuted)',
            border: '2rpx solid rgba(var(--app-danger-rgb), 0.2)',
          }
        }

        if (type === 'ghost') {
          return {
            ...style,
            color: 'var(--app-brandStrong)',
            background: 'transparent',
            border: '2rpx solid transparent',
            'box-shadow': 'none',
          }
        }

        return {
          ...style,
          color: 'var(--app-brandStrong)',
          background: 'var(--app-page)',
          border: '2rpx solid var(--app-sageSoft)',
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
