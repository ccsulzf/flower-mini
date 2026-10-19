export interface CloudResponse<T> {
  code: 0
  data: T
  requestId?: string
}

export type CloudAuthMode = 'public' | 'authenticated' | 'admin'

export type CloudOperation = 'read' | 'write'
