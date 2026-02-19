import { Link } from 'react-router-dom'
import type { Worker, WorkerStatus } from '../../types'

// ── Status config ───────────────────────────────────────────────────
// Colors via CSS vars (inline style) — reliable regardless of Tailwind scan order
const STATUS_COLOR: Record<WorkerStatus, string> = {
  BUSY:     'var(--color-info)',
  IDLE:     'var(--color-agent)',
  STARTING: 'var(--color-warning)',
  OFFLINE:  'var(--color-slate-700)',
}

// Literal class strings — must be spelled out for Tailwind v4 scanner
const STATUS_DOT: Record<WorkerStatus, string> = {
  BUSY:     'bg-info info-glow',
  IDLE:     'bg-agent agent-glow',
  STARTING: 'bg-warning warning-glow animate-pulse',
  OFFLINE:  'bg-slate-700',
}

const STATUS_BADGE: Record<WorkerStatus, string> = {
  BUSY:     'text-info     border-info/40',
  IDLE:     'text-agent    border-agent/40',
  STARTING: 'text-warning  border-warning/40',
  OFFLINE:  'text-slate-600 border-slate-800',
}

const STATUS_LABEL: Record<WorkerStatus, string> = {
  BUSY:     'BUSY',
  IDLE:     'IDLE',
  STARTING: 'INIT',
  OFFLINE:  'OFF',
}

interface WorkerCardProps {
  worker: Worker
  isSelected: boolean
  onClick: () => void
}

export function WorkerCard({ worker, isSelected, onClick }: WorkerCardProps) {
  const isActive = worker.status !== 'OFFLINE'

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left pl-4 pr-3 py-3
        transition-colors duration-150 group
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-agent
        ${isSelected
          ? 'bg-elevated'
          : `hover:bg-surface/60 ${!isActive ? 'opacity-40 hover:opacity-60' : ''}`
        }
      `}
    >
      {/* Left status bar — slides in on hover/select */}
      <div
        className={`
          absolute left-0 inset-y-0 w-[2px]
          transition-opacity duration-150
          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}
        `}
        style={{ backgroundColor: STATUS_COLOR[worker.status] }}
      />

      {/* Row 1: name + badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[worker.status]}`} />
          <span className="font-mono text-xs font-semibold text-slate-100 truncate">
            {worker.name}
          </span>
        </div>
        <span className={`
          shrink-0 font-mono text-[9px] font-semibold tracking-wider
          px-1.5 py-px border
          ${STATUS_BADGE[worker.status]}
        `}>
          {STATUS_LABEL[worker.status]}
        </span>
      </div>

      {/* Row 2: id · port */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[10px] text-slate-600 truncate">{worker.id}</span>
        <span className="font-mono text-[10px] text-slate-700 shrink-0">:{worker.port}</span>
      </div>

      {/* Row 3: current task or completed count */}
      {worker.currentTask ? (
        <p className="font-mono text-[10px] text-slate-500 truncate leading-tight">
          ▸ {worker.currentTask}
        </p>
      ) : worker.completedTasks > 0 ? (
        <p className="font-mono text-[10px] text-slate-700">
          {worker.completedTasks} tasks completed
        </p>
      ) : null}

      {/* Row 4: nav links — only when selected */}
      {isSelected && (
        <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-border" onClick={e => e.stopPropagation()}>
          <Link
            to={`/workers/${worker.id}/tasks`}
            className="flex items-center gap-1 font-mono text-[10px] text-slate-600 hover:text-slate-200 px-2 py-1 hover:bg-surface/60 transition-colors border border-transparent hover:border-border-bright"
          >
            ≡ Tasks
          </Link>
          <Link
            to={`/workers/${worker.id}/screenshots`}
            className="flex items-center gap-1 font-mono text-[10px] text-slate-600 hover:text-slate-200 px-2 py-1 hover:bg-surface/60 transition-colors border border-transparent hover:border-border-bright"
          >
            ⊙ Shots
          </Link>
        </div>
      )}
    </button>
  )
}
