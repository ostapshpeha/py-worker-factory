export type WorkerStatus = 'OFFLINE' | 'STARTING' | 'IDLE' | 'BUSY'
export type TaskStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Worker {
  id: string
  name: string
  status: WorkerStatus
  port: number
  createdAt: string      // ISO string
  currentTask?: string   // description if BUSY
  completedTasks: number
}

export interface LogLine {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warn' | 'system'
}
