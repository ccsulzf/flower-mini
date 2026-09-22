export interface FeedbackPayload {
  id: number
  type: 'success' | 'warning' | 'error'
  title: string
  message: string
}
