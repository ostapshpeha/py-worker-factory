import type { Worker, LogLine, Task, Screenshot, TaskSummary } from '../types'

// ── Task summaries (embedded in workers) ─────────────────────────
const worker1Tasks: TaskSummary[] = [
  { id: 1, prompt: 'Scraping competitor pricing — 3 sources', status: 'PROCESSING', created_at: '2026-02-19T10:12:00Z' },
  { id: 2, prompt: 'Generate monthly sales analysis report',  status: 'COMPLETED',  created_at: '2026-02-18T14:30:00Z' },
  { id: 3, prompt: 'Plan Q2 marketing strategy with timeline', status: 'COMPLETED', created_at: '2026-02-18T11:05:00Z' },
  { id: 4, prompt: 'Export client report to PDF format',      status: 'FAILED',     created_at: '2026-02-17T16:20:00Z' },
  { id: 5, prompt: 'Create product roadmap flowchart for Q3', status: 'COMPLETED',  created_at: '2026-02-17T09:30:00Z' },
  { id: 6, prompt: 'Research competitor SEO strategy and backlinks', status: 'COMPLETED', created_at: '2026-02-16T13:10:00Z' },
]

const worker2Tasks: TaskSummary[] = [
  { id: 7, prompt: 'Summarize quarterly earnings transcripts',         status: 'COMPLETED', created_at: '2026-02-19T09:00:00Z' },
  { id: 8, prompt: 'Build revenue vs cost bar chart for board deck',   status: 'COMPLETED', created_at: '2026-02-18T17:45:00Z' },
  { id: 9, prompt: 'Parse and clean raw sensor CSV dataset',           status: 'QUEUED',    created_at: '2026-02-19T09:50:00Z' },
]

// ── Workers ───────────────────────────────────────────────────────
export const mockWorkers: Worker[] = [
  {
    id: 1,
    name: 'agent-01',
    status: 'BUSY',
    user_id: 1,
    container_id: 'factory_worker_1_1',
    vnc_port: 6901,
    created_at: '2026-02-19T08:12:00Z',
    tasks: worker1Tasks,
  },
  {
    id: 2,
    name: 'agent-02',
    status: 'IDLE',
    user_id: 1,
    container_id: 'factory_worker_2_1',
    vnc_port: 6902,
    created_at: '2026-02-19T09:45:00Z',
    tasks: worker2Tasks,
  },
  {
    id: 3,
    name: 'agent-03',
    status: 'STARTING',
    user_id: 1,
    container_id: 'factory_worker_3_1',
    vnc_port: 6903,
    created_at: '2026-02-19T10:01:00Z',
    tasks: [],
  },
]

// ── Task log ──────────────────────────────────────────────────────
export const mockLogLines: LogLine[] = [
  { id: 'l1',  timestamp: '10:12:01', message: 'OpenInterpreter initialized', type: 'system' },
  { id: 'l2',  timestamp: '10:12:04', message: 'Loading skill: browser_automation.md', type: 'info' },
  { id: 'l3',  timestamp: '10:12:06', message: 'Loading skill: data_extraction.md', type: 'info' },
  { id: 'l4',  timestamp: '10:12:11', message: 'Task received: Scrape competitor pricing', type: 'success' },
  { id: 'l5',  timestamp: '10:12:12', message: 'Spawning Chrome browser instance', type: 'info' },
  { id: 'l6',  timestamp: '10:12:18', message: 'Navigating to target-site.com', type: 'info' },
  { id: 'l7',  timestamp: '10:12:31', message: 'Rate limit detected — backing off 3s', type: 'warn' },
  { id: 'l8',  timestamp: '10:12:34', message: 'Resumed — extracted 47 price records', type: 'success' },
  { id: 'l9',  timestamp: '10:12:45', message: 'Navigating to competitor-b.com', type: 'info' },
  { id: 'l10', timestamp: '10:13:02', message: 'Processing page 1 of 3', type: 'info' },
  { id: 'l11', timestamp: '10:13:18', message: 'ERROR: Selector .price-tag not found', type: 'error' },
  { id: 'l12', timestamp: '10:13:19', message: 'Retrying with fallback selector', type: 'warn' },
  { id: 'l13', timestamp: '10:13:21', message: 'Extracted 23 records from competitor-b', type: 'success' },
]

// ── Task history (full Task objects for detail views) ─────────────
export const mockTasks: Task[] = [
  // agent-01
  { id: 1, worker_id: 1, status: 'PROCESSING', prompt: 'Scraping competitor pricing — 3 sources',    result: null, logs: null, created_at: '2026-02-19T10:12:00Z', finished_at: null },
  { id: 2, worker_id: 1, status: 'COMPLETED',  prompt: 'Generate monthly sales analysis report',      result: null, logs: null, created_at: '2026-02-18T14:30:00Z', finished_at: '2026-02-18T14:47:12Z' },
  { id: 3, worker_id: 1, status: 'COMPLETED',  prompt: 'Plan Q2 marketing strategy with timeline',    result: null, logs: null, created_at: '2026-02-18T11:05:00Z', finished_at: '2026-02-18T11:48:05Z' },
  { id: 4, worker_id: 1, status: 'FAILED',     prompt: 'Export client report to PDF format',          result: null, logs: null, created_at: '2026-02-17T16:20:00Z', finished_at: '2026-02-17T16:22:18Z' },
  { id: 5, worker_id: 1, status: 'COMPLETED',  prompt: 'Create product roadmap flowchart for Q3',    result: null, logs: null, created_at: '2026-02-17T09:30:00Z', finished_at: '2026-02-17T09:38:44Z' },
  { id: 6, worker_id: 1, status: 'COMPLETED',  prompt: 'Research competitor SEO strategy and backlinks', result: null, logs: null, created_at: '2026-02-16T13:10:00Z', finished_at: '2026-02-16T13:41:22Z' },
  // agent-02
  { id: 7, worker_id: 2, status: 'COMPLETED',  prompt: 'Summarize quarterly earnings transcripts',       result: null, logs: null, created_at: '2026-02-19T09:00:00Z', finished_at: '2026-02-19T09:14:33Z' },
  { id: 8, worker_id: 2, status: 'COMPLETED',  prompt: 'Build revenue vs cost bar chart for board deck', result: null, logs: null, created_at: '2026-02-18T17:45:00Z', finished_at: '2026-02-18T17:52:07Z' },
  { id: 9, worker_id: 2, status: 'QUEUED',     prompt: 'Parse and clean raw sensor CSV dataset',         result: null, logs: null, created_at: '2026-02-19T09:50:00Z', finished_at: null },
]

// ── Screenshot history ────────────────────────────────────────────
export const mockScreenshots: Screenshot[] = [
  { id: 1, worker_id: 1, s3_url: '', created_at: '2026-02-19T10:14:32Z' },
  { id: 2, worker_id: 1, s3_url: '', created_at: '2026-02-19T10:44:55Z' },
  { id: 3, worker_id: 1, s3_url: '', created_at: '2026-02-18T14:35:11Z' },
  { id: 4, worker_id: 1, s3_url: '', created_at: '2026-02-18T14:42:09Z' },
  { id: 5, worker_id: 1, s3_url: '', created_at: '2026-02-18T11:12:44Z' },
  { id: 6, worker_id: 1, s3_url: '', created_at: '2026-02-17T09:33:20Z' },
  { id: 7, worker_id: 2, s3_url: '', created_at: '2026-02-19T09:07:18Z' },
  { id: 8, worker_id: 2, s3_url: '', created_at: '2026-02-18T17:48:03Z' },
]
