<script setup lang="ts">
import type { Memo } from '@/models/memo.interface'
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { initializeAppAuth, waitForAppAuthReady } from '@/utils/appAuth'
import { cloudEnabled } from '@/utils/cloudMode'
import { localMemo } from '@/utils/localMemo'

definePage({ layout: 'default', style: { navigationBarTitleText: '备忘录' } })

type MemoService = {
  list(args: { page: number }): Promise<{ data: Memo[] }>
  create(data: { title: string; content: string }): Promise<unknown>
  update(data: { id: string; title: string; content: string }): Promise<unknown>
  remove(data: { id: string }): Promise<unknown>
}

const cloud = (cloudEnabled ? uniCloud.importObject('memo', { customUI: true }) : localMemo) as MemoService
const items = ref<Memo[]>([])
const title = ref('')
const content = ref('')
const editingId = ref('')
const busy = ref(false)
const ready = ref(false)
const error = ref('')
const page = ref(1)
const hasMore = ref(false)

function message(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e)
    return String(e.message)
  return '操作失败，请稍后重试'
}

async function fetchList(reset = true) {
  const next = reset ? 1 : page.value + 1
  const result = await cloud.list({ page: next }) as { data: Memo[] }
  items.value = reset ? result.data : [...items.value, ...result.data]
  page.value = next
  hasMore.value = result.data.length === 20
}

async function load(retry = false, reset = true) {
  if (busy.value)
    return
  busy.value = true
  error.value = ''
  try {
    if (!cloudEnabled) {
      ready.value = true
      await fetchList(reset)
      return
    }
    if (retry)
      await initializeAppAuth(true)
    await waitForAppAuthReady()
    ready.value = true
    await fetchList(reset)
  }
  catch (e) {
    error.value = message(e)
  }
  finally {
    busy.value = false
  }
}

function cancelEdit() {
  editingId.value = ''
  title.value = ''
  content.value = ''
}

function edit(item: Memo) {
  editingId.value = item._id
  title.value = item.title
  content.value = item.content
  uni.pageScrollTo({ scrollTop: 0 })
}

async function save() {
  if (busy.value || !ready.value)
    return
  if (!title.value.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }
  busy.value = true
  error.value = ''
  try {
    if (!cloudEnabled) {
      const data = { title: title.value, content: content.value }
      if (editingId.value)
        await cloud.update({ ...data, id: editingId.value })
      else
        await cloud.create(data)
      cancelEdit()
      uni.showToast({ title: '已保存', icon: 'success' })
      await fetchList()
      return
    }
    await waitForAppAuthReady()
    const data = { title: title.value, content: content.value }
    if (editingId.value)
      await cloud.update({ ...data, id: editingId.value })
    else
      await cloud.create(data)
    cancelEdit()
    uni.showToast({ title: '已保存', icon: 'success' })
    await fetchList()
  }
  catch (e) {
    error.value = message(e)
  }
  finally {
    busy.value = false
  }
}

async function remove(item: Memo) {
  if (busy.value)
    return
  busy.value = true
  try {
    const result = await uni.showModal({ title: '删除备忘录', content: `确定删除“${item.title}”？` })
    if (!result.confirm)
      return
    error.value = ''
    if (!cloudEnabled) {
      await cloud.remove({ id: item._id })
      if (editingId.value === item._id)
        cancelEdit()
      await fetchList()
      return
    }
    await waitForAppAuthReady()
    await cloud.remove({ id: item._id })
    if (editingId.value === item._id)
      cancelEdit()
    await fetchList()
  }
  catch (e) {
    error.value = message(e)
  }
  finally {
    busy.value = false
  }
}

onShow(() => load())
</script>

<template>
  <view class="memo-page app-gradient-page">
    <view class="app-card section">
      <view class="app-section-title">
        我的备忘录
      </view>
      <view class="app-section-desc">
        {{ ready ? '记录灵感，整理日常。' : '正在连接你的账号…' }}
      </view>
      <view v-if="error" class="error-message">
        {{ error }}
      </view>
      <button v-if="error" class="app-secondary-btn" :disabled="busy" @click="load(true)">
        重新登录并加载
      </button>
    </view>

    <view class="app-card section">
      <view class="app-section-title">
        {{ editingId ? '编辑备忘录' : '新建备忘录' }}
      </view>
      <input v-model="title" class="field" placeholder="标题（最多 80 字）" :maxlength="80" :disabled="busy">
      <textarea v-model="content" class="field content-field" placeholder="写点什么（最多 2000 字）" :maxlength="2000" :disabled="busy" />
      <button class="app-primary-btn" :loading="busy" :disabled="busy || !ready" @click="save">
        {{ editingId ? '保存修改' : '新增备忘录' }}
      </button>
      <button v-if="editingId" class="app-secondary-btn" :disabled="busy" @click="cancelEdit">
        取消编辑
      </button>
    </view>

    <view class="section">
      <view class="list-heading">
        <text class="app-section-title">记录列表</text>
        <button size="mini" :disabled="busy" @click="load()">
          刷新
        </button>
      </view>
      <view v-if="!items.length && !busy && !error" class="app-card app-section-desc">
        还没有记录，创建第一条备忘录吧。
      </view>
      <view v-for="item in items" :key="item._id" class="app-card memo-item">
        <view class="app-section-title memo-text">
          {{ item.title }}
        </view>
        <view class="memo-text memo-content">
          {{ item.content || '暂无内容' }}
        </view>
        <view class="actions">
          <button class="app-secondary-btn" :disabled="busy" @click="edit(item)">
            编辑
          </button>
          <button class="app-danger-btn" :disabled="busy" @click="remove(item)">
            删除
          </button>
        </view>
      </view>
      <button v-if="hasMore" class="app-secondary-btn" :disabled="busy" @click="load(false, false)">
        加载更多
      </button>
    </view>

  </view>
</template>

<style scoped lang="scss">
.memo-page { padding: 24rpx; box-sizing: border-box; }
.section { margin-bottom: 24rpx; }
.field { box-sizing: border-box; width: 100%; margin: 24rpx 0; padding: 22rpx; background: $surface-row; border-radius: 16rpx; }
input.field { height: 88rpx; }
.content-field { height: 200rpx; }
.error-message { color: $danger-color; margin: 20rpx 0; }
.list-heading, .actions { display: flex; align-items: center; gap: 16rpx; margin: 20rpx 0; }
.list-heading { justify-content: space-between; }
.list-heading button { margin: 0; }
.actions button { flex: 1; }
.memo-item { margin-top: 20rpx; }
.memo-text { overflow-wrap: anywhere; white-space: pre-wrap; }
.memo-content { margin-top: 16rpx; color: $text-soft; }
</style>
