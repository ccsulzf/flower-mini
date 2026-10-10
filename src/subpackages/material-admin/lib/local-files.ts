import { collectLocalMaterials } from './local-materials'

// 目录包含主花、配花、叶材、花瓶与花束包装；新增档案后需重建此入口的 glob 清单。
// JSON 使用标准模块导入；uni-app 构建不保证 .json?raw 有 default 导出。
const metadata = import.meta.glob('../assets/**/material.json', { eager: true, import: 'default' }) as Record<string, unknown>
const svg = import.meta.glob('../assets/**/*.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const files: Record<string, string> = { ...svg }
for (const [path, value] of Object.entries(metadata)) files[path] = JSON.stringify(value)
export const localCatalog = collectLocalMaterials(files)
