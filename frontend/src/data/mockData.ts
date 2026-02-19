import type { Worker, LogLine } from '../types'

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
