import { defineStore } from 'pinia'
import { ref } from 'vue'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { uploadDraft } from './upload'
import type { MaterialDraft, UploadedMaterial } from './types'
interface BatchProgress { total: number, completed: number, succeeded: number, skipped: number, currentName: string }
interface UploadFailure { id: string, name: string, message: string }
export const useMaterialAdminStore = defineStore('material-admin', () => {
  const remote = ref<UploadedMaterial[] | null>(null)
  const busy = ref(false)
  const error = ref('')
  const message = ref('')
  const batchProgress = ref<BatchProgress | null>(null)
  const uploadFailures = ref<UploadFailure[]>([])
  function failure(value: unknown) {
    return value instanceof Error ? value.message : typeof value === 'object' && value !== null && 'errMsg' in value ? String(value.errMsg) : '操作失败，请重试'
  }
  async function run(task: () => Promise<void>) {
    if (busy.value) return
    busy.value = true; error.value = ''; message.value = ''
    try { await waitForAppAuthReady(); await task() }
    catch (value) { error.value = failure(value) }
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
  async function uploadAll(drafts: MaterialDraft[]) {
    await run(async () => {
      const cloud = uniCloud.importObject('flower-material-admin', { customUI: true })
      // 一次权限检查和状态读取；逐项上传，避免文件和数据库写入同时失控。
      const snapshot: UploadedMaterial[] = (await cloud.list()).items
      remote.value = snapshot
      const revisions = new Map(snapshot.map(item => [item.id, item.revision]))
      const queue = drafts.filter(item => revisions.get(item.id) !== item.revision)
      uploadFailures.value = []
      batchProgress.value = { total: queue.length, completed: 0, succeeded: 0, skipped: drafts.length - queue.length, currentName: '' }
      for (const draft of queue) {
        batchProgress.value.currentName = draft.name
        try {
          const record = await uploadDraft(draft)
          await cloud.save(record)
          remote.value = [...remote.value.filter(item => item.id !== record.id), { ...record, updatedAt: Date.now() }]
          batchProgress.value.succeeded++
        } catch (value) {
          uploadFailures.value.push({ id: draft.id, name: draft.name, message: failure(value) })
        } finally { batchProgress.value.completed++ }
      }
      batchProgress.value.currentName = ''
      message.value = `上传完成：成功 ${batchProgress.value.succeeded} 项，跳过 ${batchProgress.value.skipped} 项，失败 ${uploadFailures.value.length} 项`
    })
  }
  async function remove(draft: MaterialDraft) {
    await run(async () => {
      const cloud = uniCloud.importObject('flower-material-admin', { customUI: true })
      await cloud.remove({ id: draft.id })
      // 只在云端删除成功后更新状态；本地档案继续保留以便重新上传。
      if (remote.value) remote.value = remote.value.filter(item => item.id !== draft.id)
      message.value = `${draft.name}已从云端删除，本地素材已保留`
    })
  }
  return { remote, busy, error, message, batchProgress, uploadFailures, refresh, upload, uploadAll, remove }
})
