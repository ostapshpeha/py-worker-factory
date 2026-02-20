import type { SkillId } from '../lib/skills'

export type { SkillId }

export type WorkerStatus = 'OFFLINE' | 'STARTING' | 'IDLE' | 'BUSY'
export type TaskStatus   = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

// Matches backend WorkerRead schema
export interface Worker {
  id: number
  name: string
  status: WorkerStatus
  user_id: number
  container_id: string | null
  vnc_port: number | null
  vnc_password?: string        // only present on create response
  created_at?: string          // not yet in schema, added when wiring API
  tasks?: TaskSummary[]
}

// Matches backend WorkerStatusRead schema (list endpoint)
export interface WorkerSummary {
  id: number
  name: string
  status: WorkerStatus
  container_id: string | null
}

// Matches backend TaskListSchema
export interface TaskSummary {
  id: number
  prompt: string
  status: TaskStatus
  created_at: string
}

// Matches backend TaskRead schema
export interface Task {
  id: number
  worker_id: number
  status: TaskStatus
  prompt: string
  result: string | null
  logs: string | null
  created_at: string
  finished_at: string | null
}

// Matches backend ImageRead schema
export interface Screenshot {
  id: number
  worker_id: number
  s3_url: string
  created_at: string
}

export interface LogLine {
  id: string
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warn' | 'system'
}
