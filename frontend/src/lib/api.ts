import type { Worker, WorkerSummary, TaskSummary, Task, Screenshot } from '../types'

// ── Token storage ─────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// ── Fetch wrapper ──────────────────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}

/** Fetch + parse JSON. Throws with `detail` message on non-2xx. */
export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { detail?: string }).detail ?? `HTTP ${res.status}`)
  return data as T
}

// ── Workers ────────────────────────────────────────────────────────

export function getWorkers(): Promise<WorkerSummary[]> {
  return apiJson('/routers/v1/workers/')
}

export function getWorker(id: number): Promise<Worker> {
  return apiJson(`/routers/v1/workers/${id}`)
}

export function createWorker(name: string): Promise<Worker> {
  return apiJson('/routers/v1/workers/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function deleteWorker(id: number, force = false): Promise<void> {
  const res = await apiFetch(`/routers/v1/workers/${id}?force=${force}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
}

export function stopWorker(id: number, force = false): Promise<WorkerSummary> {
  return apiJson(`/routers/v1/workers/${id}/stop?force=${force}`, { method: 'POST' })
}

export function startWorker(id: number): Promise<WorkerSummary> {
  return apiJson(`/routers/v1/workers/${id}/start`, { method: 'POST' })
}

// ── Tasks ──────────────────────────────────────────────────────────

/** Returns TaskListSchema[] from backend — id, prompt, status, created_at */
export function getWorkerTasks(workerId: number): Promise<TaskSummary[]> {
  return apiJson(`/routers/v1/workers/${workerId}/tasks`)
}

export function createTask(workerId: number, prompt: string): Promise<Task> {
  return apiJson(`/routers/v1/workers/${workerId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
}

export function getTask(taskId: number): Promise<Task> {
  return apiJson(`/routers/v1/tasks/${taskId}`)
}

// ── Screenshots ────────────────────────────────────────────────────

/** Capture a new screenshot and return its presigned URL. 30s cooldown enforced by backend. */
export function captureScreenshot(workerId: number): Promise<Screenshot> {
  return apiJson(`/routers/v1/workers/${workerId}/screenshot`)
}

export function getScreenshots(workerId: number): Promise<Screenshot[]> {
  return apiJson(`/routers/v1/workers/${workerId}/screenshots`)
}
