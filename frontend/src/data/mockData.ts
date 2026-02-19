import type { Worker, LogLine, Task, Screenshot } from '../types'

// ── Workers ───────────────────────────────────────────────────────
export const mockWorkers: Worker[] = [
  {
    id: 'wkr_a1b2c3',
    name: 'agent-01',
    status: 'BUSY',
    port: 6901,
    createdAt: '2026-02-19T08:12:00Z',
    currentTask: 'Scraping competitor pricing — 3 sources',
    completedTasks: 14,
  },
  {
    id: 'wkr_d4e5f6',
    name: 'agent-02',
    status: 'IDLE',
    port: 6902,
    createdAt: '2026-02-19T09:45:00Z',
    completedTasks: 3,
  },
  {
    id: 'wkr_g7h8i9',
    name: 'agent-03',
    status: 'STARTING',
    port: 6903,
    createdAt: '2026-02-19T10:01:00Z',
    completedTasks: 0,
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

// ── Task history ──────────────────────────────────────────────────
export const mockTasks: Task[] = [
  // agent-01
  {
    id: 'tsk_c9d0e1',
    workerId: 'wkr_a1b2c3',
    status: 'PROCESSING',
    description: 'Scraping competitor pricing — 3 sources',
    skill: 'web-researcher',
    createdAt: '2026-02-19T10:12:00Z',
  },
  {
    id: 'tsk_f2g3h4',
    workerId: 'wkr_a1b2c3',
    status: 'COMPLETED',
    description: 'Generate monthly sales analysis report',
    skill: 'data-wizard',
    createdAt: '2026-02-18T14:30:00Z',
    completedAt: '2026-02-18T14:47:12Z',
    durationSec: 1032,
  },
  {
    id: 'tsk_i5j6k7',
    workerId: 'wkr_a1b2c3',
    status: 'COMPLETED',
    description: 'Plan Q2 marketing strategy with timeline',
    skill: 'planner',
    createdAt: '2026-02-18T11:05:00Z',
    completedAt: '2026-02-18T11:48:05Z',
    durationSec: 2585,
  },
  {
    id: 'tsk_l8m9n0',
    workerId: 'wkr_a1b2c3',
    status: 'FAILED',
    description: 'Export client report to PDF format',
    skill: 'document-generator',
    createdAt: '2026-02-17T16:20:00Z',
    completedAt: '2026-02-17T16:22:18Z',
    durationSec: 138,
  },
  {
    id: 'tsk_o1p2q3',
    workerId: 'wkr_a1b2c3',
    status: 'COMPLETED',
    description: 'Create product roadmap flowchart for Q3',
    skill: 'diagram-builder',
    createdAt: '2026-02-17T09:30:00Z',
    completedAt: '2026-02-17T09:38:44Z',
    durationSec: 524,
  },
  {
    id: 'tsk_r4s5t6',
    workerId: 'wkr_a1b2c3',
    status: 'COMPLETED',
    description: 'Research competitor SEO strategy and backlinks',
    skill: 'web-researcher',
    createdAt: '2026-02-16T13:10:00Z',
    completedAt: '2026-02-16T13:41:22Z',
    durationSec: 1882,
  },
  // agent-02
  {
    id: 'tsk_u7v8w9',
    workerId: 'wkr_d4e5f6',
    status: 'COMPLETED',
    description: 'Summarize quarterly earnings transcripts',
    skill: 'document-generator',
    createdAt: '2026-02-19T09:00:00Z',
    completedAt: '2026-02-19T09:14:33Z',
    durationSec: 873,
  },
  {
    id: 'tsk_x0y1z2',
    workerId: 'wkr_d4e5f6',
    status: 'COMPLETED',
    description: 'Build revenue vs cost bar chart for board deck',
    skill: 'diagram-builder',
    createdAt: '2026-02-18T17:45:00Z',
    completedAt: '2026-02-18T17:52:07Z',
    durationSec: 427,
  },
  {
    id: 'tsk_a3b4c5',
    workerId: 'wkr_d4e5f6',
    status: 'QUEUED',
    description: 'Parse and clean raw sensor CSV dataset',
    skill: 'data-wizard',
    createdAt: '2026-02-19T09:50:00Z',
  },
]

// ── Screenshot history ────────────────────────────────────────────
export const mockScreenshots: Screenshot[] = [
  { id: 'scr_001', workerId: 'wkr_a1b2c3', capturedAt: '2026-02-19T10:14:32Z', taskId: 'tsk_c9d0e1', index: 1 },
  { id: 'scr_002', workerId: 'wkr_a1b2c3', capturedAt: '2026-02-19T10:44:55Z', taskId: 'tsk_c9d0e1', index: 2 },
  { id: 'scr_003', workerId: 'wkr_a1b2c3', capturedAt: '2026-02-18T14:35:11Z', taskId: 'tsk_f2g3h4', index: 3 },
  { id: 'scr_004', workerId: 'wkr_a1b2c3', capturedAt: '2026-02-18T14:42:09Z', taskId: 'tsk_f2g3h4', index: 4 },
  { id: 'scr_005', workerId: 'wkr_a1b2c3', capturedAt: '2026-02-18T11:12:44Z', taskId: 'tsk_i5j6k7', index: 5 },
  { id: 'scr_006', workerId: 'wkr_a1b2c3', capturedAt: '2026-02-17T09:33:20Z', taskId: 'tsk_o1p2q3', index: 6 },
  { id: 'scr_007', workerId: 'wkr_d4e5f6', capturedAt: '2026-02-19T09:07:18Z', taskId: 'tsk_u7v8w9', index: 1 },
  { id: 'scr_008', workerId: 'wkr_d4e5f6', capturedAt: '2026-02-18T17:48:03Z', taskId: 'tsk_x0y1z2', index: 2 },
]
