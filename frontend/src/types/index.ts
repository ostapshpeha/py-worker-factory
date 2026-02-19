import type { SkillId } from '../lib/skills'

export type { SkillId }

export type WorkerStatus = 'OFFLINE' | 'STARTING' | 'IDLE' | 'BUSY'
export type TaskStatus   = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Worker {
  id: string
  name: string
  status: WorkerStatus
  port: number
  createdAt: string
  currentTask?: string
  completedTasks: number
}

export interface Task {
  id: string
  workerId: string
  status: TaskStatus
  description: string
  skill: SkillId
  createdAt: string
  completedAt?: string
  durationSec?: number
}

export interface Screenshot {
  id: string
  workerId: string
  capturedAt: string
  taskId?: string
  index: number   // sequential capture number per worker
}

export interface LogLine {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warn' | 'system'
}
