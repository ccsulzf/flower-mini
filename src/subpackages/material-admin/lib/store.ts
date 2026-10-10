import { defineStore } from 'pinia'
import { ref } from 'vue'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { uploadDraft } from './upload'
import type { MaterialDraft, UploadedMaterial } from './types'
export const useMaterialAdminStore = defineStore('material-admin', () => {
  const remote = ref<UploadedMaterial[] | null>(null)
  const busy = ref(false)
  const error = ref('')
  const message = ref('')
  async function run(task: () => Promise<void>) {
    if (busy.value) return
    busy.value = true; error.value = ''; message.value = ''
    try { await waitForAppAuthReady(); await task() }
    catch (value) { error.value = value instanceof Error ? value.message : typeof value === 'object' && value !== null && 'errMsg' in value ? String(value.errMsg) : '操作失败，请重试' }
    finally { busy.value = false }
  }
  async function refresh() {
    await run(async () => {
      const cloud = uniCloud.importObject('flower-material-admin', { customUI: true })
      remote.value = (await cloud.list()).items
      message.value = '云端状态已更新'
    })
  }
  async function upload(draft: MaterialDraft) {
    await run(async () => {
      const cloud = uniCloud.importObject('flower-material-admin', { customUI: true })
      // 上传前检查服务器角色，普通用户不会先上传文件。
      const snapshot: UploadedMaterial[] = (await cloud.list()).items
      const record = await uploadDraft(draft)
      await cloud.save(record)
      // 写入成功即可更新状态；读取失败不会把已成功的上传误报为失败。
      remote.value = [...snapshot.filter(item => item.id !== record.id), { ...record, updatedAt: Date.now() }]
      message.value = `${draft.name}已上传`
    })
  }
  return { remote, busy, error, message, refresh, upload }
})
