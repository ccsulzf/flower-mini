import type { FeedbackPayload } from '@/models/feedback.interface'
import { defineStore } from 'pinia'
import { ref } from 'vue'

let feedbackSeed = 0
export const useFeedbackStore = defineStore('feedbackStore', () => {
  const latestFeedback = ref<FeedbackPayload | null>(null)
  function triggerSuccess(title = '操作成功', message = '已完成') {
    latestFeedback.value = { id: ++feedbackSeed, type: 'success', title, message }
  }
  function triggerWarning(title = '请注意', message = '请确认后继续') {
    latestFeedback.value = { id: ++feedbackSeed, type: 'warning', title, message }
  }
  function triggerError(title = '操作失败', message = '请稍后重试') {
    latestFeedback.value = { id: ++feedbackSeed, type: 'error', title, message }
  }
  function clearLatestFeedback() { latestFeedback.value = null }
  return { latestFeedback, triggerSuccess, triggerWarning, triggerError, clearLatestFeedback }
})
