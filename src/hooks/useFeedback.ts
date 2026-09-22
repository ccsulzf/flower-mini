import { useFeedbackStore } from '@/stores/feedbackStore'

export function useFeedback() {
  const feedbackStore = useFeedbackStore()

  const triggerSuccess = (title = '操作成功', message = '已完成') => {
    feedbackStore.triggerSuccess(title, message)
  }

  const triggerWarning = (title = '请注意', message = '请确认后继续') => {
    feedbackStore.triggerWarning(title, message)
  }

  const triggerError = (title = '操作失败', message = '请稍后重试') => {
    feedbackStore.triggerError(title, message)
  }

  return {
    triggerSuccess,
    triggerWarning,
    triggerError,
  }
}
